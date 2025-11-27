# Diyanet API - Manuel Konum ve Günlük İçerik Dokümantasyonu

Bu dosya, GPS kullanmadan manuel konum seçimi (Ülke -> Şehir -> İlçe) ve Günlük Esmaul Hüsna verisi için kullanılan endpoint'leri açıklar.

**Base URL:** `https://t061.diyanet.gov.tr`
**Auth:** Tüm istekler `Authorization: Bearer <TOKEN>` başlığı gerektirir.

---

## 📍 1. Manuel Konum Seçim Akışı

Konum seçimi hiyerarşik (sıralı) bir yapıdadır. Bir önceki adımda alınan `id`, bir sonraki adımın parametresi olur.

### Adım 1: Ülkeleri Getir
Tüm dünya ülkelerini listeler.

* **Endpoint:** `GET /apigateway/awqatsalah/api/Place/Countries`
* **Parametreler:** Yok.
* **Dönüş:** Ülke listesi (`id`, `name`, `code`).
* **Örnek:** Türkiye ID'si `2` olarak döner.

### Adım 2: Şehirleri (İlleri) Getir
Seçilen ülkeye ait şehirleri/eyaletleri listeler.

* **Endpoint:** `GET /apigateway/awqatsalah/api/Place/States/{countryId}`
* **Parametreler:**
    * `{countryId}`: 1. adımda seçilen Ülke ID'si (Örn: Türkiye için `2`).
* **Dönüş:** Şehir listesi (`id`, `name`, `code`).
* **Örnek:** Sivas ID'si `571` olarak döner.

### Adım 3: Bölgeleri (İlçeleri) Getir
Seçilen şehre ait ilçeleri listeler. **Bu son adımdır.**

* **Endpoint:** `GET /apigateway/awqatsalah/api/Place/Cities/{stateId}`
* **Parametreler:**
    * `{stateId}`: 2. adımda seçilen Şehir/İl ID'si (Örn: Sivas için `571`).
* **Dönüş:** İlçe listesi.
* **Önemli Not:** Buradan dönen `id` (Örn: Divriği için `9858`), namaz vakitlerini çekmek için kullanılan **HEDEF ID**'dir.

---

## 🌙 2. Günlük İçerik

### Günün Esmaul Hüsna'sı
Her gün için Allah'ın bir ismini, okunuşunu ve anlamını getirir.

* **Endpoint:** `GET /apigateway/apisuperapp/EsmaulHusna/esmaul-husna-of-the-day/tr`
* **Parametreler:**
    * `tr`: Dil kodu (URL içinde sabit).
* **Dönüş:**
    * `arabic`: Arapça yazılışı.
    * `read`: Türkçe okunuşu (Örn: "el-Fettâh").
    * `translation`: Anlamı.
    * `id`: Sıra numarası.