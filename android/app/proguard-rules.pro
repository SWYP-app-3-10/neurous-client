# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ============================================
# React Native 기본 규칙 (필수)
# ============================================
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
    void set*(***);
    *** get*();
}

# ============================================
# React Native - Hermes (필수)
# ============================================
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ============================================
# React Native - Native Modules & View Managers
# ============================================
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    public *;
}
-keepclassmembers class * extends com.facebook.react.bridge.BaseJavaModule {
    public *;
}
-keepclassmembers class * implements com.facebook.react.bridge.NativeModule {
    public *;
}
-keepclassmembers class * extends com.facebook.react.uimanager.ViewManager {
    public *;
}
-keepclassmembers class * extends com.facebook.react.uimanager.SimpleViewManager {
    public *;
}

# ============================================
# React Native - TurboModules (New Architecture)
# ============================================
-keepclassmembers class * extends com.facebook.react.turbomodule.core.NativeModule {
    public *;
}

# ============================================
# React Native - JSC (JSC 사용 시에만 필요)
# ============================================
-keep class org.webkit.** { *; }

# ============================================
# React Native - SoLoader
# ============================================
-keep class com.facebook.soloader.** { *; }

# ============================================
# 네이티브 메서드 (JNI)
# ============================================
-keepclasseswithmembernames class * {
    native <methods>;
}

# ============================================
# 리플렉션 사용 클래스
# ============================================
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ============================================
# Parcelable & Serializable
# ============================================
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator CREATOR;
}
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ============================================
# R 클래스
# ============================================
-keepclassmembers class **.R$* {
    public static <fields>;
}

# ============================================
# 네이버 로그인
# ============================================

# Generic / Reflection metadata
# Naver SDK 내부에서 reflection/generic 타입 정보를 사용하므로 유지
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes RuntimeVisibleAnnotations
-keepattributes RuntimeInvisibleAnnotations
-keepattributes RuntimeVisibleParameterAnnotations
-keepattributes RuntimeInvisibleParameterAnnotations
-keepattributes AnnotationDefault

# Kotlin metadata
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**

# Naver Login SDK
-keep class com.navercorp.** { *; }
-dontwarn com.navercorp.**

-keep class com.navercorp.nid.** { *; }
-dontwarn com.navercorp.nid.**

-keep class com.navercorp.nid.oauth.** { *; }
-dontwarn com.navercorp.nid.oauth.**

-keep class com.naver.** { *; }
-dontwarn com.naver.**

-keep class com.nhn.android.naverlogin.** { *; }
-dontwarn com.nhn.android.naverlogin.**

# React Native Naver Login bridge
-keep class com.dooboolab.** { *; }
-dontwarn com.dooboolab.**

-keep class com.crossplatformkorea.** { *; }
-dontwarn com.crossplatformkorea.**

-keep class com.reactnativenaverlogin.** { *; }
-dontwarn com.reactnativenaverlogin.**

-keep class com.reactnativenaver.** { *; }
-dontwarn com.reactnativenaver.**

# Gson / reflection fallback
-keep class com.google.gson.** { *; }
-dontwarn com.google.gson.**

-keep class * extends com.google.gson.reflect.TypeToken
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# ============================================
# 카카오 SDK
# ============================================
-keep class com.kakao.sdk.** { *; }
-dontwarn com.kakao.sdk.**

# ============================================
# Google Mobile Ads
# ============================================
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# ============================================
# Firebase (필요한 부분만 유지)
# ============================================
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Firebase Analytics
-keep class com.google.firebase.analytics.** { *; }
-keep class com.google.android.gms.measurement.** { *; }

# Firebase Auth
-keep class com.google.firebase.auth.** { *; }
-keep class com.google.android.gms.internal.firebase-auth-api.** { *; }

# ============================================
# react-native-svg
# ============================================
-keep class com.horcrux.svg.** { *; }
-dontwarn com.horcrux.svg.**

# ============================================
# react-native-linear-gradient
# ============================================
-keep class com.BV.LinearGradient.** { *; }
-dontwarn com.BV.LinearGradient.**

# ============================================
# react-native-screens
# ============================================
-keep class com.swmansion.rnscreens.** { *; }
-dontwarn com.swmansion.rnscreens.**

# ============================================
# react-native-safe-area-context
# ============================================
-keep class com.th3rdwave.safeareacontext.** { *; }
-dontwarn com.th3rdwave.safeareacontext.**

# ============================================
# react-native-google-signin
# ============================================
-keep class com.reactnativegooglesignin.** { *; }
-dontwarn com.reactnativegooglesignin.**

# ============================================
# react-native-permissions
# ============================================
-keep class com.zoontek.rnpermissions.** { *; }
-dontwarn com.zoontek.rnpermissions.**

# ============================================
# lottie-react-native
# ============================================
-keep class com.airbnb.lottie.** { *; }
-dontwarn com.airbnb.lottie.**

# Add any project specific keep options here:
