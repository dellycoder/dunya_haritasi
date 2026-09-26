# 🌍 Dünya Atlası 3D

Gerçek zamanlı gece/gündüz aydınlatması olan, 3 boyutlu, interaktif ve animasyonlu bir dünya haritası.

## Özellikler

- **3D küre** – WebGL (three.js + globe.gl), yıldızlı arka plan, atmosfer parıltısı ve dönen bulut katmanı
- **Gerçek zamanlı gece / gündüz** – Güneşin o anki konumu hesaplanır; gece tarafında şehir ışıkları görünür
- **Ülke sınırları** – Natural Earth 1:50m verisi; üzerine gelince ülke yükselir, seçilince altın renge boyanır
- **Bayraklar** – 250+ ülkenin bayrağı başkentlerinde işaret olarak durur; yakınlaştıkça küçük ülkeler de görünür
- **Ülke paneli** (tıklayınca):
  - Başkentin **güncel yerel saati ve tarihi** (saniye saniye, yaz saati dahil), UTC farkı ve size göre saat farkı
  - Gün doğumu / batımı ve gün ilerleme çubuğu
  - **Güncel hava durumu** (sıcaklık, hissedilen, nem, rüzgâr, basınç, bulutluluk, UV) + 6 günlük tahmin
  - **Nüfus** (REST Countries'ten canlı; bağlantı yoksa yerleşik veri), yüzölçümü, yoğunluk, diller, para birimi, telefon kodu
  - Tıklanabilir komşu ülkeler
- **Animasyonlar** – Ülkeye uçuş kamerası, önceki ülkeden yeni ülkeye animasyonlu yay, başkentte yayılan halkalar, dalgalanan bayrak
- **Arama** – Türkçe/İngilizce ülke veya başkent adıyla (`/` kısayolu, ok tuşları, Enter)
- **Paylaşılabilir bağlantı** – `#TR`, `#JP` gibi adreslerle doğrudan ülke açılır
- Mobil uyumlu; `Esc` ile panel kapanır

## Çalıştırma

```bash
npm install
npm run dev      # geliştirme sunucusu → http://localhost:5173
npm run build    # üretim çıktısı → dist/
npm run preview  # üretim çıktısını önizle
```

Ülke verisi `src/data/countries.json` dosyasında hazır gelir. Yeniden üretmek için: `npm run data`.

## GitHub Pages

`main` dalına gönderilen her değişiklik `.github/workflows/deploy.yml` ile otomatik yayınlanır.
Depo ayarlarında **Settings → Pages → Source: GitHub Actions** seçilmelidir.

## Veri kaynakları

| Veri | Kaynak |
|---|---|
| Ülke sınırları | [Natural Earth](https://www.naturalearthdata.com/) (world-atlas) |
| Ülke bilgileri, Türkçe adlar | [mledoze/countries](https://github.com/mledoze/countries) |
| Başkent koordinatları | [GeoNames](https://www.geonames.org/) (cities.json) |
| Saat dilimleri | countries-and-timezones + Open-Meteo |
| Canlı nüfus | [REST Countries](https://restcountries.com/) |
| Hava durumu | [Open-Meteo](https://open-meteo.com/) (API anahtarı gerekmez) |
| Bayraklar | [flag-icons](https://github.com/lipis/flag-icons) |
| Dünya dokuları | NASA Blue Marble / Black Marble (three-globe örnekleri) |
