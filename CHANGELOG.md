# Değişiklik Günlüğü

## Yeni Özellikler (16 Kasım 2025)

### 🎨 Tema Sistemi
- **Aydınlık ve Karanlık Tema**: Kullanıcılar artık aydınlık ve karanlık tema arasında geçiş yapabilir
- **Gradient Arka Planlar**: Her tema için özel gradient arka plan renkleri
- **Uyumlu Renk Paletleri**: Tüm bileşenler temaya uygun renklerle güncellendi
- **Tema Toggle Butonu**: Sağ üst köşede ay/güneş ikonu ile kolay tema değiştirme

#### Tema Renkleri:
**Aydınlık Tema:**
- Mavi tonlarında gradient arka plan (#E3F2FD → #90CAF9)
- Beyaz kartlar ve temiz görünüm
- Aktif namaz için yeşil gradient

**Karanlık Tema:**
- Lacivert tonlarında gradient arka plan (#1A237E → #3F51B5)
- Koyu gri kartlar ve göz yormayan renkler
- Aktif namaz için turkuaz gradient

### 📍 Geliştirilmiş Lokasyon Seçici
- **Açılır-Kapanır Tasarım**: Lokasyon seçici artık accordion stili ile çalışır
- **Vakitlerin Altında**: Seçici her zaman namaz vakitlerinin altında görünür
- **İstediğiniz Zaman Açın**: "Konum Değiştir" butonuna basarak dilediğiniz zaman açabilirsiniz
- **Manuel Onay**: Seçiminizi "Konumu Onayla" butonu ile onaylayana kadar açık kalır
- **Kolay Kapatma**: "Konumu Gizle" butonu ile hızlıca kapatabilirsiniz

### 📱 Responsive (Duyarlı) Tasarım
Tüm bileşenler farklı ekran boyutlarında mükemmel çalışır:

#### Ekran Boyutları:
- **Küçük Ekranlar** (< 360px): Kompakt görünüm, 2 sütun düzeni
- **Orta Ekranlar** (360px - 768px): Dengeli görünüm, 3 sütun düzeni
- **Büyük Ekranlar** (> 768px): Geniş görünüm, büyük fontlar

#### Responsive Özellikler:
- Font boyutları ekran boyutuna göre ayarlanır
- Padding ve margin değerleri dinamik
- Kart boyutları ve grid düzeni otomatik uyarlanır
- Buton ve input yükseklikleri responsive
- Shadow ve elevation değerleri optimize edildi

### 🎯 Kullanıcı Deneyimi İyileştirmeleri
1. **Türkçe Namaz İsimleri**: Tüm namaz isimleri Türkçe gösteriliyor
2. **Gradient Efektler**: Aktif namaz vakti için göz alıcı gradient efekt
3. **Gelişmiş Sonraki Namaz Kartı**: Daha büyük ve belirgin gösterim
4. **Shadow ve Elevation**: Tüm kartlara derinlik efekti eklendi
5. **Smooth Transitions**: Tema geçişleri ve animasyonlar

### 🔧 Teknik İyileştirmeler
- `ThemeContext` ile merkezi tema yönetimi
- `useTheme` hook'u ile kolay tema erişimi
- Responsive breakpoint sistemi
- Dinamik stil oluşturma fonksiyonları
- TypeScript tip güvenliği

## Kullanım

### Tema Değiştirme
Sağ üst köşedeki ay (🌙) veya güneş (☀️) ikonuna dokunarak tema değiştirebilirsiniz.

### Konum Değiştirme
1. "▼ Konum Değiştir" butonuna dokunun
2. Ülke, şehir ve bölge seçin
3. "✓ Konumu Onayla" butonuna basın
4. Namaz vakitleri otomatik güncellenecek

### Responsive Davranış
Uygulama otomatik olarak ekran boyutunuzu algılar ve en iyi görünümü sağlar. Telefon döndürme veya farklı cihazlarda test edebilirsiniz.

## Kurulum Notları

Yeni eklenen paket:
```bash
npm install react-native-linear-gradient
npm install --save-dev @types/react-native-linear-gradient
```

## Gelecek Güncellemeler
- [ ] Tema tercihini kaydetme (AsyncStorage)
- [ ] Daha fazla tema seçeneği
- [ ] Animasyonlu tema geçişleri
- [ ] Özel renk paletleri
