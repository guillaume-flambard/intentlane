import Foundation

// IntentLane Cyberduck pilot — the pure rules.
//
// Eligibility, name matching, identifier lookup, the store projection and the
// record's own field set. No AppIntents and no Cyberduck.
//
// The field set is the centre of this suite. A `.duck` file holds a hostname, a
// login name, a private key path, a certificate and four filesystem paths
// (`Host.java:252-300`), and this application is the one where that list decides
// whether the integration is a good idea. A record that grew a field to hold any
// of them would put a client's customers' server names or a client's private key
// path into a Siri utterance, so the set is read back with Mirror and compared.
//
// The projection is tested on a real file with all thirteen keys, because "we only
// read two keys" is a claim about code and the only way to keep it is to hand the
// projection a file that has the other eleven in it.

var failures = 0
func check(_ condition: Bool, _ message: String) {
  if condition { print("ok   \(message)") } else { print("FAIL \(message)"); failures += 1 }
}

// MARK: - Fixtures, written as the application writes them

/// One `.duck` file with every key `Host.serialize` can write, so the projection
/// is handed the keys it must not read rather than only the two it may.
func writeBookmark(
  uuid: String,
  nickname: String?,
  extraKeys: [String: String] = [:],
  as fileName: String? = nil
) throws -> URL {
  var dict: [String: Any] = [
    "Protocol": "sftp",
    "UUID": uuid,
    "Hostname": "client-1.acme-cdn.example",
    "Port": "22",
    "Username": "svc-deploy",
    "CDN Credentials": "cdn-svc",
    "Path": "/srv/acme/incoming",
    "Workdir Dictionary": "/Users/deploy/build/acme",
    "Encoding": "UTF-8",
    "Client Certificate": "acme-deploy.cer",
    "Private Key File": "/Users/deploy/.ssh/acme_ed25519",
    "Private Key File Dictionary": "<key data>",
    "Download Folder": "/Users/deploy/Downloads",
    "Upload Folder": "/Users/deploy/Uploads",
  ]
  if let nickname { dict["Nickname"] = nickname }
  for (key, value) in extraKeys { dict[key] = value }

  let data = try PropertyListSerialization.data(fromPropertyList: dict, format: .xml, options: 0)
  let url = FileManager.default.temporaryDirectory
    .appendingPathComponent("intentlane-cyberduck-fixtures", isDirectory: true)
  try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
  let file = url.appendingPathComponent(fileName ?? "\(uuid).duck")
  try data.write(to: file)
  return file
}

func withFixtures<T>(_ body: (URL) throws -> T) rethrows -> T {
  let folder = FileManager.default.temporaryDirectory
    .appendingPathComponent("intentlane-cyberduck-fixtures", isDirectory: true)
  defer { try? FileManager.default.removeItem(at: folder) }
  return try body(folder)
}

// MARK: - The record carries nothing forbidden

let connection = ConnectionRecord(id: "1A2B3C4D-0001", nickname: "Acme production")
let storedFields = Mirror(reflecting: connection).children.compactMap(\.label).sorted()

check(
  storedFields == ["id", "nickname"],
  "the record has exactly the two classified fields, so a hostname, a username, a key path or a local path has nowhere to live"
)
for forbidden in ["host", "hostname", "user", "username", "key", "path", "port", "protocol", "folder", "certificate"] {
  check(!storedFields.contains { $0.lowercased().contains(forbidden) }, "and no field is named after \(forbidden)")
}

let described = String(describing: connection)
check(!described.contains("acme-cdn.example"), "a record renders no hostname")
check(!described.contains("svc-deploy"), "and no login name")
check(!described.contains("/Users/"), "and no filesystem path")
check(!described.contains("ed25519"), "and no private key")

// MARK: - Eligibility

let nameless = ConnectionRecord(id: "1A2B3C4D-0002", nickname: "  ")
let renamed = ConnectionRecord(id: connection.id, nickname: "Acme production EU")

check(connection.isEligible, "a connection with a nickname is eligible")
check(!nameless.isEligible, "a connection with no nickname is not eligible, because Host.java only writes the key when it is non-blank")
check(eligibleConnections(from: [connection, nameless]) == [connection], "eligibility keeps the source order and drops the rest")
check(eligibleConnections(from: []) .isEmpty, "an empty store yields nothing")

// MARK: - Name matching

check(matches(connection, term: "Acme production"), "an exact nickname matches")
check(matches(connection, term: "acme production"), "matching ignores case")
check(matches(connection, term: "  Acme production  "), "surrounding whitespace is ignored")
check(!matches(connection, term: "Acme"), "a prefix does not match, because that would guess")
check(!matches(connection, term: "production"), "a suffix does not match either")
check(!matches(connection, term: "Acme production EU"), "a longer name does not match")
check(!matches(connection, term: "renamed"), "a different name does not match")
check(!matches(connection, term: ""), "an empty term never matches")
check(!matches(connection, term: "   "), "a blank term never matches")
check(!matches(nameless, term: "  "), "a nameless connection matches nothing, not even a blank term")

// MARK: - Identifier lookup

let pool = [connection, nameless]

check(connection(withIdentifier: "1A2B3C4D-0001", in: pool)?.id == "1A2B3C4D-0001", "a connection is found by its UUID")
check(connection(withIdentifier: "1A2B3C4D-0002", in: pool) == nil, "a connection with no nickname is not found")
check(connection(withIdentifier: "invented", in: pool) == nil, "an unknown UUID finds nothing")
check(connection(withIdentifier: "1a2b3c4d-0001", in: pool) == nil, "a UUID is matched exactly, never case-folded")
check(connection(withIdentifier: "Acme production", in: pool) == nil, "a nickname is not a UUID, even when it is the display title")

// A rename replaces the record rather than joining it, because the store holds one
// file per UUID and cannot hold two records with the same one. A pool with both
// would test an ordering accident rather than a rename.
check(connection(withIdentifier: "1A2B3C4D-0001", in: [renamed])?.nickname == "Acme production EU",
      "a rename changes what the person sees and leaves the UUID untouched")
check(connection(withIdentifier: "1A2B3C4D-0001", in: [nameless, renamed])?.nickname == "Acme production EU",
      "and the renamed record is found whatever else is in the folder")

// MARK: - The projection, on a real file

try withFixtures { folder in
  let full = try writeBookmark(uuid: "1A2B3C4D-0001", nickname: "Acme production", extraKeys: [:])

  guard let projected = ConnectionFile.record(at: full) else {
    check(false, "a well-formed bookmark projects to a record")
    return
  }
  check(projected.id == "1A2B3C4D-0001", "the identifier is the UUID key")
  check(projected.nickname == "Acme production", "the title is the Nickname key")
  check(projected.isEligible, "and the result is eligible")

  let rendered = String(describing: projected)
  check(!rendered.contains("acme-cdn.example"), "a full bookmark projects to a record holding no hostname")
  check(!rendered.contains("svc-deploy"), "and no login name")
  check(!rendered.contains("ed25519"), "and no private key path")
  check(!rendered.contains("/Users/"), "and no local path, even though the file held three")
  check(!rendered.contains("acme-deploy.cer"), "and no certificate")

  let namelessFile = try writeBookmark(uuid: "1A2B3C4D-0002", nickname: nil)
  let namelessProjection = ConnectionFile.record(at: namelessFile)
  check(namelessProjection?.id == "1A2B3C4D-0002", "a bookmark with no Nickname key still yields the UUID")
  check(namelessProjection?.nickname == "", "and its nickname is empty rather than invented")
  check(namelessProjection?.isEligible == false, "which is why it is not eligible")

  // A file that is not a readable property list. None of the three exposure rules
  // covers "unreadable", and the pilot skips the file rather than pretend one of
  // them fits. This is the gap the contract names.
  let broken = folder.appendingPathComponent("1A2B3C4D-0003.duck")
  try Data("this is not a property list".utf8).write(to: broken)
  check(ConnectionFile.record(at: broken) == nil, "a file that is not a readable property list projects to nothing")
  check(ConnectionFile.record(at: folder.appendingPathComponent("absent.duck")) == nil, "and so does a file that is not there")

  // The filename is a cross-check, not the identifier. The pilot reads the UUID out
  // of the file because that is the model's own field.
  check(stemAgrees(with: "1A2B3C4D-0001", record: projected), "a file named after its own UUID is well formed")
  check(!stemAgrees(with: "1A2B3C4D-9999", record: projected), "a file whose name disagrees with its UUID is not")
  check(!stemAgrees(with: "", record: projected), "and a file with no name stem at all is not either")

  // MARK: - The folder, which is the query

  let readable = try writeBookmark(uuid: "1A2B3C4D-0001", nickname: "Acme production")
  try writeBookmark(uuid: "1A2B3C4D-0002", nickname: nil)
  try writeBookmark(uuid: "1A2B3C4D-0004", nickname: "Acme staging")
  try Data("not a plist".utf8).write(to: folder.appendingPathComponent("1A2B3C4D-0003.duck"))
  // A readable bookmark whose name disagrees with its UUID. This is a different
  // defect from an unreadable file and the count has to keep them apart: one is a
  // file that was renamed behind the application's back, the other is a file the
  // application could not read either.
  try writeBookmark(uuid: "1A2B3C4D-0005", nickname: "Acme edge", as: "renamed-by-hand.duck")
  try Data("<plist/>".utf8).write(to: folder.appendingPathComponent("notes.txt"))

  let loaded = ConnectionFolder.load(in: folder)
  check(
    loaded.records.map(\.id).sorted() == ["1A2B3C4D-0001", "1A2B3C4D-0004"],
    "the folder yields the two readable, well-formed, nicknamed bookmarks"
  )
  check(loaded.records.count == 2, "and nothing else")
  check(loaded.unreadable == 1, "the one file that is not a readable plist is counted as unreadable rather than dropped silently")
  check(loaded.mismatched == 1, "and the readable file whose name disagrees with its UUID is counted separately, because that is a different defect")
  check(loaded.unreadable + loaded.mismatched + loaded.records.count == 4,
        "and the four .duck files are accounted for: two records, one unreadable, one mismatched")
  check(
    Set(loaded.records.map(\.id)) == Set(loaded.locations.map { $0.id }),
    "every record that came back has a file, because the open path needs one"
  )
  check(loaded.locations.count == loaded.records.count, "so the locations and the records are the same size")
  check(
    loaded.locations.allSatisfy { $0.url.lastPathComponent.hasSuffix(".duck") },
    "and every location is a .duck file, which is the only extension the application mounts"
  )
  check(
    Set(loaded.locations.map(\.id)).isDisjoint(with: ["1A2B3C4D-0002"]),
    "the connection with no nickname has no location, because an unusable record is not opened"
  )
  check(
    loaded.records.map(\.id) == ["1A2B3C4D-0001", "1A2B3C4D-0004"],
    "and the records come back in the order the folder listed them"
  )
  _ = readable

  // The store is read twice and gives the same answer, which is what makes the
  // index diff meaningful rather than a race.
  check(
    ConnectionFolder.load(in: folder).records.map(\.id) == loaded.records.map(\.id),
    "reading the folder twice yields the same records in the same order"
  )
}

if failures == 0 {
  print("ALL CORE TESTS PASSED")
} else {
  print("FAILURES: \(failures)")
  exit(1)
}
