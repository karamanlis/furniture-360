# AI Furniture 360 Visualizer

Tek bir mobilya ürün görselinden 24 farklı açıda (0°–345°, 15° aralık) görsel üreten AI destekli web uygulaması.

## ✨ Özellikler

- **Görsel yükleme**: Drag & drop veya URL ile referans görsel
- **24 açı üretimi**: Her görsel 15°'de bir, product identity korunarak
- **Grid görünüm**: Responsive grid (2/3/4/6 kolon) ile tüm açıların durumu
- **Live progress**: Üstte progress bar "12/24 completed" gibi
- **Live log**: Zaman damgalı gerçek zamanlı log paneli
- **Hata yönetimi**: Bir açıda hata olursa diğerleri devam eder, tek tek veya toplu RETRY
- **Identity QC**: Vision model ile ürün tutarlılığı kontrolü (PASS/WARNING/FAIL)
- **Auto-Fix**: Düşük QC skorlu görseller otomatik yeniden üretilir
- **ZIP indirme**: `prefix-000.jpg` … `prefix-345.jpg` formatında 24 görsel
- **Concurrency kontrolü**: Maksimum 3 eşzamanlı generation

## 🚀 Hızlı Başlangıç

```bash
# Bağımlılıkları kur
npm install

# .env.local oluştur (mock provider için ekstra gerek yok)
cp .env.local.example .env.local

# Dev sunucusu başlat
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini aç.

## 🔧 Konfigürasyon (.env.local)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `IMAGE_GENERATION_PROVIDER` | `mock` | `mock`, `pollinations` veya `openai` |
| `OPENAI_API_KEY` | — | OpenAI API anahtarı (openai provider için) |
| `OPENAI_IMAGE_MODEL` | `gpt-image-1` | Görsel üretim modeli |
| `OPENAI_VISION_MODEL` | `gpt-4o` | Identity QC vision modeli |
| `GENERATION_CONCURRENCY` | `3` | Eşzamanlı generation sayısı |
| `UPLOAD_MAX_MB` | `10` | Maksimum yükleme boyutu |

> ⚠️ **API anahtarı asla frontend'e gönderilmez.** Sadece sunucu tarafında kullanılır. `IMAGE_GENERATION_PROVIDER=mock` ile API anahtarı olmadan tüm akış test edilebilir.

### Ücretsiz gerçekçi üretim: Pollinations

`IMAGE_GENERATION_PROVIDER=pollinations` ayarı ile hiçbir API anahtarı olmadan **gerçekçi** görseller üretilir:

- Referans görseliniz **img2img** olarak iletilir → 24 açı boyunca aynı ürün kalır.
- Açı + ürün adından **sabit seed** türetilir → retry'lerde aynı görsel yeniden üretilir.
- Anonim kullanım limiti ~1 istek/15 sn'dir; `GENERATION_CONCURRENCY=1` ile 24 açı ~6 dakika sürer.
- (Opsiyonel) auth.pollinations.ai'de ücretsiz hesap ile `POLLINATIONS_SECRET` tanımlarsanız limit ~1/5 sn'ye düşer.

## 🗂️ Proje Yapısı

```
src/
├── app/
│   ├── api/
│   │   ├── generate/           # POST — job oluştur
│   │   │   └── [jobId]/
│   │   │       ├── route.ts    # GET — durum sorgulama
│   │   │       ├── control/    # Pause/Resume/Stop
│   │   │       ├── retry/      # Başarısız açıları tekrar üret
│   │   │       └── image/      # Üretilen görsel servis
│   │   ├── reference/          # Referans görsel servis
│   │   ├── download/           # ZIP indirme
│   │   └── qc/                 # Identity QC
│   ├── layout.tsx              # Dark theme shell
│   └── page.tsx
├── components/
│   ├── playground/             # UI component'ler
│   └── ui/                     # Küçük UI primitives
├── hooks/                      # Custom React hooks
├── lib/
│   ├── image-generation/       # Provider abstraction
│   │   ├── provider.ts         # Arayüz
│   │   ├── openai.ts           # OpenAI gpt-image-1
│   │   ├── mock.ts             # Test provider (API key gerekmez)
│   │   ├── openai-vision.ts    # Vision QC
│   │   ├── mock-vision.ts
│   │   └── index.ts            # Factory
│   ├── job-manager.ts          # Server-side state (singleton)
│   ├── prompts.ts              # Prompt engine
│   ├── storage.ts              # Disk yönetimi
│   ├── zip.ts                  # Streaming ZIP
│   ├── vision.ts               # QC yardımcıları
│   └── types.ts                # Paylaşılan tipler
└── server/
    └── queue.ts                # Concurrency-3 task queue
```

## 🧪 Test

```bash
# E2E test (mock provider ile):
# 1. Dev sunucusunu başlat (npm run dev)
# 2. Tarayıcıda görsel yükle + form doldur
# 3. Generate 360° butonuna bas
# 4. 24 açının tamamlanmasını izle
# 5. Download All ile ZIP indir
```

## 🏗️ Mimari Notlar

- **Job state**: In-memory `Map` (singleton). Sunucu restart edilirse job'lar kaybolur.
- **Görseller**: `data/jobs/<jobId>/` dizininde saklanır, ayrı route'dan servis edilir (poll JSON'unda base64 yok).
- **Hata fırtınası koruması**: 6+ ardışık hata → job duraklatılır, API key kontrolü istenir.
- **Product identity en önemli kural**: Model ürünü yeniden tasarlayamaz — sadece kamera açısı değişir.
- **Self-hosted Node gerektirir** (serverless'ta arka plan queue ölür).