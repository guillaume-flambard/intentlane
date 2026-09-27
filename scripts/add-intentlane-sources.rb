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
# Usage: scripts/add-intentlane-sources.rb <project.pbxproj> <target-name> <file>...
#
# Exit 0 when the target names every file, whether this run added it or a
# previous one did. Exit 1 on a usage error or a target that does not exist.

require "xcodeproj"

project_path, target_name, *files = ARGV

if project_path.nil? || target_name.nil? || files.empty?
  warn "usage: #{$PROGRAM_NAME} <project.pbxproj> <target-name> <file>..."
  exit 1
end

unless File.exist?(project_path)
  warn "no such project: #{project_path}"
  exit 1
end

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

added = []
already = []

files.each do |file|
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

if added.empty? && build_settings_set.empty?
  puts "nothing to do, the target already named every file"
end
