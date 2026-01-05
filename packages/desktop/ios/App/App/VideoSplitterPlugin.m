#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(VideoSplitterPlugin, "VideoSplitter",
    CAP_PLUGIN_METHOD(pickVideo, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getMetadata, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(splitVideo, CAPPluginReturnPromise);
)
