// IntentLane HandBrake pilot — the deletion suite's Objective-C surface.
//
// The application's own bridging header imports HBController, which imports the
// HandBrakeKit module, whose headers are the same files the app target compiles
// locally. That combination is the app's build, not a test's. This header declares
// only the classes the deletion suite reaches, and it reaches them through the
// source tree, so nothing is duplicated or shimmed beyond the import prefix.
//
// HBPresetsManager.h is the application's own header, unchanged, and it is what
// declares HBPresetsChangedNotification. The suite observes the same notification
// name the tree posts, not a copy of it.

#import "HBPreset.h"
#import "HBPresetsManager.h"
#import "HBTreeNode.h"
#import "HBPilotPresetsHarness.h"
