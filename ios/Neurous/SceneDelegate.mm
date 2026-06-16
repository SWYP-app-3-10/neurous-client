#import "SceneDelegate.h"
#import "AppDelegate.h"
#import "RCTReactNativeFactory.h"

@implementation SceneDelegate

- (void)scene:(UIScene *)scene
willConnectToSession:(UISceneSession *)session
      options:(UISceneConnectionOptions *)connectionOptions
{
  UIWindowScene *windowScene = (UIWindowScene *)scene;
  self.window = [[UIWindow alloc] initWithWindowScene:windowScene];

  AppDelegate *appDelegate = (AppDelegate *)[[UIApplication sharedApplication] delegate];
  appDelegate.reactNativeFactory = [[RCTReactNativeFactory alloc] initWithDelegate:appDelegate];
  [appDelegate.reactNativeFactory startReactNativeWithModuleName:@"Neurous" inWindow:self.window];
}

@end
