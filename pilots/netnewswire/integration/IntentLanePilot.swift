// IntentLane pilot integration for NetNewsWire.
//
// This file belongs to the IntentLane project, not to NetNewsWire upstream. It is
// copied into a NetNewsWire checkout at the pinned revision by
// pilots/netnewswire/reproduce.sh, next to IntentLaneGenerated.swift, so both
// compile into the NetNewsWire target.
//
// It contains no application logic beyond mapping NetNewsWire's own models to the
// generated IntentLane entities and routing Apple's requests into the seams
// NetNewsWire already exposes (the article deep link and the in-app search).

import AppIntents
import AppKit
import CoreSpotlight
import Foundation
import Account
import Articles

enum IntentLanePilotError: Error {
	case articleNotFound(String)
}

@available(macOS 27.0, *)
@MainActor
private func intentLaneEntity(for article: Article) -> IntentLaneArticleEntity {
	IntentLaneArticleEntity(
		id: article.articleID,
		title: article.title ?? "",
		feed: article.feed?.nameForDisplay ?? article.account?.nameForDisplay
	)
}

@available(macOS 27.0, *)
@MainActor
private func intentLaneArticles(ids: Set<String>) -> [Article] {
	guard !ids.isEmpty else { return [] }
	var found = [Article]()
	for account in AccountManager.shared.activeAccounts {
		found.append(contentsOf: account.fetchArticles(.articleIDs(ids)))
	}
	return found
}

@available(macOS 27.0, *)
@MainActor
private func intentLaneArticle(id: String) -> Article? {
	intentLaneArticles(ids: [id]).first(where: { $0.articleID == id })
}

// MARK: - Entity resolution

@available(macOS 27.0, *)
@MainActor
final class IntentLaneArticleResolverImplementation: IntentLaneArticleResolver {

	func articleEntities(for identifiers: [String]) async throws -> [IntentLaneArticleEntity] {
		let wanted = Set(identifiers)
		let found = intentLaneArticles(ids: wanted)
		let byID = Dictionary(found.map { ($0.articleID, $0) }, uniquingKeysWith: { first, _ in first })
		// Return only exact matches, in the order requested. An unknown identifier
		// must return no entity and never a similarly named one.
		return identifiers.compactMap { byID[$0] }.map(intentLaneEntity)
	}

	func articleEntities(matching string: String) async throws -> [IntentLaneArticleEntity] {
		let term = string.trimmingCharacters(in: .whitespacesAndNewlines)
		guard !term.isEmpty else { return [] }
		var found = [Article]()
		for account in AccountManager.shared.activeAccounts {
			found.append(contentsOf: account.fetchArticles(.search(term)))
		}
		var seen = Set<String>()
		var entities = [IntentLaneArticleEntity]()
		for article in found {
			guard seen.insert(article.articleID).inserted else { continue }
			entities.append(intentLaneEntity(for: article))
			if entities.count >= 20 { break }
		}
		return entities
	}

	func suggestedArticleEntities() async throws -> [IntentLaneArticleEntity] {
		var found = [Article]()
		for account in AccountManager.shared.activeAccounts {
			found.append(contentsOf: account.fetchArticles(.today(nil)))
		}
		var seen = Set<String>()
		var entities = [IntentLaneArticleEntity]()
		for article in found.sorted(by: { $0.logicalDatePublished > $1.logicalDatePublished }) {
			guard seen.insert(article.articleID).inserted else { continue }
			entities.append(intentLaneEntity(for: article))
			if entities.count >= 12 { break }
		}
		return entities
	}
}

// MARK: - Open

@available(macOS 27.0, *)
@MainActor
final class IntentLaneOpenArticleImplementation: OpenArticleHandler {

	func perform(target: IntentLaneArticleEntity) async throws {
		guard let article = intentLaneArticle(id: target.id) else {
			throw IntentLanePilotError.articleNotFound(target.id)
		}
		appDelegate.openIntentLaneArticle(article.pathUserInfo)
	}
}

// MARK: - Search

@available(macOS 27.0, *)
@MainActor
final class IntentLaneSearchArticlesImplementation: SearchArticlesHandler {

	func perform(criteria: StringSearchCriteria) async throws {
		let term = criteria.term.trimmingCharacters(in: .whitespacesAndNewlines)
		guard !term.isEmpty else { return }
		appDelegate.intentLaneSearch(for: term)
	}
}

// MARK: - Mark read

@available(macOS 27.0, *)
@MainActor
final class IntentLaneMarkArticleReadImplementation: MarkArticleReadHandler {

	func perform(article_id: String) async throws {
		let wanted: Set<String> = [article_id]
		for account in AccountManager.shared.activeAccounts {
			let matches = account.fetchArticles(.articleIDs(wanted))
			if let article = matches.first(where: { $0.articleID == article_id }) {
				try await account.markArticles(articleIDs: [article.articleID], statusKey: .read, flag: true)
				return
			}
		}
		throw IntentLanePilotError.articleNotFound(article_id)
	}
}

// MARK: - Registration

@available(macOS 27.0, *)
@MainActor
enum IntentLanePilotIntegration {

	private static var registered = false

	/// Idempotent: registering twice keeps the first handlers.
	static func register() {
		guard !registered else { return }
		registered = true
		IntentLaneEntityResolvers.article = IntentLaneArticleResolverImplementation()
		IntentLaneIntentHandlers.open_article = IntentLaneOpenArticleImplementation()
		IntentLaneIntentHandlers.search_articles = IntentLaneSearchArticlesImplementation()
		IntentLaneIntentHandlers.mark_article_read = IntentLaneMarkArticleReadImplementation()
	}
}
