#import "HBPresetsManager.h"

// IntentLane HandBrake pilot — the deletion suite's entry into Objective-C.
//
// The test drives the real HBPresetsManager, so it needs the manager and the
// notification its tree posts. The pilot's own bridging header already promotes
// the three preset properties the intents need; this header is for the test only,
// and exists because a Swift file cannot import an Objective-C header on its own.

@interface HBPilotPresetsHarness : NSObject

// HandBrake initialises libhandbrake once at application start, in HBCore. The
// manager asks libhandbrake for the built-in presets JSON, so a test that skips that
// initialisation gets a null pointer rather than a useful error.
+ (void)startHandBrakeCore;

+ (HBPresetsManager *)managerForPresetsAtURL:(NSURL *)url
    NS_SWIFT_NAME(manager(forPresetsAt:));
+ (NSIndexPath *)indexPathOfPresetNamed:(NSString *)name inManager:(HBPresetsManager *)manager
    NS_SWIFT_NAME(indexPath(ofPresetNamed:in:));
+ (void)deletePresetAtIndexPath:(NSIndexPath *)indexPath inManager:(HBPresetsManager *)manager
    NS_SWIFT_NAME(deletePreset(atIndexPath:in:));

@end
