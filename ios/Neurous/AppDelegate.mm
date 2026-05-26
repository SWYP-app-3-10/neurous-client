#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>
#import <React/RCTLinkingManager.h> 
#import <RNKakaoLogins.h> 
#import <Firebase.h> // Firebase 헤더 추가          

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure]; // Firebase 초기화

  self.moduleName = @"Neurous";
  self.dependencyProvider = [RCTAppDependencyProvider new];
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  // 1. 카카오 로그인 URL인지 먼저 확인
  if ([RNKakaoLogins isKakaoTalkLoginUrl:url]) {
    return [RNKakaoLogins handleOpenUrl:url];
  }

  // 2. 카카오가 아니라면, React Native LinkingManager가 처리 (네이버, 구글, 딥링크 등)
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end