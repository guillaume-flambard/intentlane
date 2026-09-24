#import "HBPilotPresetsHarness.h"
#import "HBPreset.h"
#import "handbrake/handbrake.h"

// IntentLane HandBrake pilot — the deletion suite's entry into Objective-C.
//
// Nothing here reimplements anything. Every call forwards to the real manager and
// the real tree, so the test exercises the same objects the application does. The
// manager is constructed against a URL the test controls, which keeps the
// developer's own presets untouched.

@implementation HBPilotPresetsHarness

+ (void)startHandBrakeCore
{
    static dispatch_once_t once;
    dispatch_once(&once, ^{
        hb_global_init();
    });
}

+ (HBPresetsManager *)managerForPresetsAtURL:(NSURL *)url
{
    [self startHandBrakeCore];
    return [[HBPresetsManager alloc] initWithURL:url];
}

+ (NSIndexPath *)indexPathOfPresetNamed:(NSString *)name inManager:(HBPresetsManager *)manager
{
    __block NSIndexPath *found = nil;
    [manager.root enumerateObjectsUsingBlock:^(HBPreset *preset, NSIndexPath *indexPath, BOOL *stop) {
        if (!found && preset.isLeaf && [preset.name isEqualToString:name])
        {
            found = indexPath;
            *stop = YES;
        }
    }];
    return found;
}

+ (void)deletePresetAtIndexPath:(NSIndexPath *)indexPath inManager:(HBPresetsManager *)manager
{
    [manager deletePresetAtIndexPath:indexPath];
}

@end
