# NamazVakti

Konum tabanli namaz vakitleri uygulamasi (React Native + TypeScript).

Bu dokuman, uygulamayi sifirdan kendi bilgisayarina kurup calistirmak isteyen kullanicilar ve gelistiriciler icin hazirlandi.

## Ozellikler

- Gunluk / haftalik / aylik namaz vakitleri
- GPS ve manuel konum secimi
- Cevrimdisi calisma icin yerel onbellek
- Kible pusulasi
- Android ana ekran widget destegi
- Acik / koyu tema

## Teknoloji Yigini

- React Native 0.75.3
- React 18.3.1
- TypeScript
- Axios
- AsyncStorage
- NetInfo
- Reanimated
- Android native module (Kotlin)

## Gereksinimler

Asagidaki araclarin bilgisayarinda kurulu olmasi gerekir:

1. Node.js 18+ (proje `node >=18` bekliyor)
2. npm (Node ile gelir)
3. Git
4. Java Development Kit (JDK) 17 (Android build icin onerilir)
5. Android Studio (Android SDK + emulator)
6. Android SDK Platform Tools (`adb` komutu PATH icinde olmali)
7. iOS icin (sadece macOS): Xcode + CocoaPods
8. iOS icin Ruby (Gemfile ile pod surumu yonetiliyor)

Resmi React Native ortam kurulum rehberi:

- https://reactnative.dev/docs/environment-setup

Not: Bu proje React Native CLI tabanlidir, Expo projesi degildir.

## 1) Repoyu Indir

```bash
git clone https://github.com/furkandogan1362/NamazVakti.git
cd NamazVakti
```

## 2) JavaScript Bagimliliklarini Kur

```bash
npm install
```

## 3) iOS Bagimliliklari (yalnizca macOS)

Once gem bagimliliklarini kur:

```bash
bundle install
```

Ardindan CocoaPods kurulumunu yap:

```bash
cd ios
bundle exec pod install
cd ..
```

Not: `bundle` kullanmadan `pod install` da calisir, ancak Gemfile surum kilitlemesi nedeniyle `bundle exec pod install` tercih edilir.

## 4) Android Ortamini Hazirla

Android Studio icinde su adimlari tamamla:

1. Android SDK kurulu olsun
2. En az bir emulator (AVD) olustur
3. Emulatoru baslat veya USB debug acik fiziksel cihaz bagla

Windows icin yaygin PATH degiskenleri:

- `ANDROID_HOME` veya `ANDROID_SDK_ROOT`
- `%ANDROID_HOME%\platform-tools`
- `%ANDROID_HOME%\emulator`

`adb devices` komutunda cihaz/emulator gorunuyorsa hazirsin.

## 5) Uygulamayi Calistir

### Gelistirme sunucusu (Metro)

```bash
npm start
```

### Android

Ayri bir terminalde:

```bash
npm run android
```

### iOS (sadece macOS)

Ayri bir terminalde:

```bash
npm run ios
```

## Kullanilabilir NPM Scriptleri

- `npm start` -> Metro bundler
- `npm run android` -> Android debug calistirma
- `npm run ios` -> iOS debug calistirma
- `npm run lint` -> ESLint kontrolu
- `npm test` -> Jest testleri

## Android Widget Notu

Proje Android tarafinda native widget modulune sahiptir. Widget davranisi cihaz ureticisine gore farkli olabilir (ozellikle batarya optimizasyonu ve arka plan kisitlari).

Uygulamanin widget ve bildirim ozellikleri icin gerekirse su izin ayarlari kontrol edilmelidir:

1. Battery optimization istisnasi
2. Bildirim izinleri
3. Otomatik baslatma (ureticiye gore degisir)

## Sorun Giderme

### 1) Android build hatalari

```bash
cd android
gradlew clean
cd ..
npm run android
```

### 2) Metro cache temizleme

```bash
npx react-native start --reset-cache
```

### 3) iOS pod hatalari (macOS)

```bash
cd ios
bundle exec pod install --repo-update
cd ..
```

### 4) Cihaz gorunmuyor

- Android: `adb devices` kontrol et
- iOS: Xcode simulator/cihaz secimini kontrol et

## Proje Yapisi (Kisa)

- `src/components`: UI bilesenleri
- `src/hooks`: Is mantigi (custom hook'lar)
- `src/contexts`: Global state (tema, ag, konum)
- `src/services`: Storage ve widget servisleri
- `src/api`: Diyanet API entegrasyonu
- `android`: Native Android kodlari (widget dahil)
- `ios`: Native iOS proje dosyalari

## Lisans

Bu projede lisans dosyasi bulunmuyorsa varsayilan olarak tum haklari saklidir. Acik kaynak yapmak istersen `LICENSE` dosyasi ekleyebilirsin.
