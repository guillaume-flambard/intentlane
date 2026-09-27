#!/usr/bin/env ruby
# frozen_string_literal: true

# Add IntentLane's generated sources to an Xcode app target.
#
# A classic PBXGroup project does not pick up a file that exists on disk: the
# project has to name it, or the build succeeds and never compiles it. That is
# the failure this script exists to remove, and it is the reason it is a script
# and not a manual edit of a project file that is hundreds of kilobytes.
#
# The script is idempotent by construction: it adds what is missing and reports
# what was already there, so running it twice changes nothing the second time.
# That is not a convenience, it is the property the recipe asks for, because a
# script that is not idempotent cannot be run again after a failed build.
#
# A `.h` among the files is a bridging header rather than a source: it is put in
# the group, it sets SWIFT_OBJC_BRIDGING_HEADER, and it is not compiled. Everything
# else is a source and goes in the sources build phase.
#
# Usage: scripts/add-intentlane-sources.rb <project.xcodeproj> <target-name> <file>...
#
# Exit 0 when the target names every file, whether this run added it or a
# previous one did. Exit 1 on a usage error or a target that does not exist.

require "xcodeproj"
require "pathname"

project_path, target_name, *files = ARGV

if project_path.nil? || target_name.nil? || files.empty?
  warn "usage: #{$PROGRAM_NAME} <project.xcodeproj> <target-name> <file-or-bridging-header>..."
  exit 1
end

unless File.exist?(project_path)
  warn "no such project: #{project_path}"
  exit 1
end

# Xcodeproj::Project.open appends "project.pbxproj" itself, so this is given the
# .xcodeproj and not the file inside it. Passing the file is not a smaller path to
# the same project, it is a path to a path, and it fails with a message about a
# pbxproj under a pbxproj.

project = Xcodeproj::Project.open(project_path)
target = project.targets.find { |candidate| candidate.name == target_name }

if target.nil?
  warn "no target named '#{target_name}' in #{project_path}"
  warn "targets: #{project.targets.map(&:name).join(', ')}"
  exit 1
end

# One group per pilot, created once and found again on the next run.
def group_for(project, target, name)
  existing = project.main_group[name]
  return existing if existing

  project.main_group.new_group(name, name)
end

group = group_for(project, target, "IntentLane")
sources_phase = target.source_build_phase
existing_paths = sources_phase.files.filter_map { |build_file| build_file.file_ref&.real_path.to_s }

# A target that had no Swift declares no SWIFT_VERSION, and Xcode refuses an
# empty one as soon as a Swift file joins it. Setting it here rather than by hand
# is what makes this script complete for its purpose: "add Swift to a target that
# has none" is one operation, and HandBrake's record already lists missing Swift
# build settings as its own deviation, separately from the missing file.
swift_version = target.build_configurations.first.build_settings["SWIFT_VERSION"]
build_settings_set = []

if swift_version.nil? || swift_version.to_s.strip.empty?
  target.build_configurations.each do |configuration|
    configuration.build_settings["SWIFT_VERSION"] = "5.0"
    build_settings_set << configuration.name
  end
end

# A header named here is a bridging header, not a source. The app target is
# Objective-C and App Intents is Swift, so the Swift that calls the application
# needs the application's classes in scope, and Xcode takes them from one header
# rather than from generated interfaces. The header is referenced by a build
# setting and must not be compiled, so it goes in the group and stays out of the
# sources phase.
#
# A second header with a different path already set is refused rather than
# overwritten. Two bridges into one target is a real thing to want and never a
# thing to get by running a script twice.
headers, sources = files.partition { |file| File.extname(file) == ".h" }
bridging_setting_set = []

if headers.length > 1
  warn "a target has at most one bridging header, and this run names #{headers.length}:"
  headers.each { |header| warn "  #{File.basename(header)}" }
  exit 1
end

headers.each do |header|
  absolute = File.expand_path(header)
  unless File.exist?(absolute)
    warn "no such bridging header: #{absolute}"
    exit 1
  end

  group.new_reference(absolute) unless group.files.any? { |ref| ref.real_path.to_s == absolute }

  relative = Pathname.new(absolute).relative_path_from(Pathname.new(File.dirname(project_path))).to_s
  current = target.build_configurations.map { |configuration| configuration.build_settings["SWIFT_OBJC_BRIDGING_HEADER"] }.uniq.compact.reject(&:empty?)

  if !current.empty? && current != [relative]
    warn "the target already sets SWIFT_OBJC_BRIDGING_HEADER to #{current.join(', ')}"
    warn "and this run would set it to #{relative}. Refusing rather than overwriting."
    exit 1
  end

  next if current == [relative]

  target.build_configurations.each do |configuration|
    configuration.build_settings["SWIFT_OBJC_BRIDGING_HEADER"] = relative
    bridging_setting_set << configuration.name
  end
end

added = []
already_present = []

sources.each do |file|
  absolute = File.expand_path(file)
  group.new_reference(absolute) unless group.files.any? { |ref| ref.real_path.to_s == absolute }

  # Membership in the sources phase is what compiles it, and a reference in the
  # group is only what makes it visible. Both are needed and they are separate.
  next if existing_paths.include?(absolute)

  reference = project.files.find { |candidate| candidate.real_path.to_s == absolute } || group.files.find { |candidate| candidate.real_path.to_s == absolute }
  if reference.nil?
    warn "could not resolve #{absolute} in the project"
    exit 1
  end

  sources_phase.add_file_reference(reference, true)
  added << absolute
end

project.save

puts "target:  #{target_name}"
puts "added:   #{added.empty? ? 'none' : added.map { |path| File.basename(path) }.join(', ')}"
puts "present: #{files.map { |path| File.basename(path) }.join(', ')}"
unless build_settings_set.empty?
  puts "swift:   set SWIFT_VERSION=5.0 on #{build_settings_set.join(', ')}, which the target did not declare"
end
unless bridging_setting_set.empty?
  puts "bridge:  set SWIFT_OBJC_BRIDGING_HEADER=#{headers.map { |path| File.basename(path) }.join(', ')} on #{bridging_setting_set.join(', ')}"
end

if added.empty? && build_settings_set.empty? && bridging_setting_set.empty?
  puts "nothing to do, the target already named every file"
end
