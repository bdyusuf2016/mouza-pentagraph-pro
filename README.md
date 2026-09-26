# মৌজা পেন্টাগ্রাফ প্রো — Mouza Pantograph Pro

> **CS · SA · RS · BS** ঐতিহাসিক ক্যাডাস্ট্রাল মৌজা নকশা সুপারইম্পোজিশন, নির্ভুল এলাইনমেন্ট (Affine / Similarity / TPS Rubber-Sheet) ও ডিজিটাল দাগ পরিমাপ ওয়েব অ্যাপ্লিকেশন।

---

## 🌟 মূল বৈশিষ্ট্যসমূহ (Key Features)

- 🗺️ **মাল্টি-লেয়ার সুপারইম্পোজিশন (Multi-Layer Overlay):** CS, SA, RS এবং BS জরিপের নকশা একাধিক লেয়ারে একসাথে যুক্ত ও প্রদর্শন।
- 🔄 **অটো ও ম্যানুয়াল এলাইনমেন্ট (Advanced Alignment):**
  - **Similarity Transformation** (স্কেল, রোটেশন, ট্রান্সলেশন)
  - **Affine Transformation** (শেয়ার ও অসম সংকোচন দূরীকরণ)
  - **Rubber Sheeting / Thin Plate Spline (TPS)** (স্থানীয় বিকৃতি ও পেপার সংকোচন সমন্বয়)
  - **দ্বি-পয়েন্ট ও ডাইমেনশন লাইন এলাইনমেন্ট**
- 📐 **ক্যাডাস্ট্রাল ভূমি জরিপ পরিমাপ (Land Survey Measurement):**
  - গান্টার স্কেল ও লিঙ্ক (Link) ভিত্তিক সুনির্দিষ্ট হিসাব
  - বহুতলীয় নকশার দাগ ক্ষেত্রফল হিসাব (শতাংশ / শতক, কাঠা, বিঘা, একর)
  - বহুভুজ ডাইমেনশন ও দূরত্ব পরিমাপক
- 📄 **মাল্টি-ফরম্যাট সাপোর্ট:**
  - হাই-রেজোলিউশন PDF (ভেক্টর ও রাস্টার পেজ পার্সার)
  - GeoTIFF / TIFF ফাইল
  - সাধারণ ইমেজ (JPG, PNG, WebP)
- 🎛️ **রঙ ফিল্টারিং ও ট্রান্সপারেন্সি কন্ট্রোল:** প্রতিটি লেয়ারের জন্য আলাদা অস্বচ্ছতা (Opacity), ব্লেন্ড মোড এবং কালার টিন্ট সমন্বয়।

---

## 🛠️ ব্যবহৃত প্রযুক্তি (Tech Stack)

- **Frontend:** React 19, TypeScript
- **Styling:** Tailwind CSS, Lucide Icons, Motion
- **Map & Canvas:** HTML5 Canvas API (High-DPI optimized)
- **Document Parsers:** `pdfjs-dist`, `geotiff`
- **Build Tool:** Vite

---

## 🚀 লোকাল সেটআপ ও রান করার নিয়ম (Getting Started)

### প্রয়োজনীয় টুলস:
- [Node.js](https://nodejs.org/) (v18 বা পরবর্তী সংস্করণ)
- `npm` বা `bun`

### ধাপসমূহ:

1. **রিপোজিটরি ক্লোন করুন:**
   ```bash
   git clone https://github.com/bdyusuf2016/mouza-pentagraph-pro.git
   cd mouza-pentagraph-pro
   ```

2. **ডিপেন্ডেন্সি ইন্সটল করুন:**
   ```bash
   npm install
   ```

3. **ডেভেলপমেন্ট সার্ভার চালু করুন:**
   ```bash
   npm run dev
   ```
   এরপর ব্রাউজারে `http://localhost:3000` লিঙ্কে প্রবেশ করুন।

4. **প্রোডাকশন বিল্ড:**
   ```bash
   npm run build
   ```

---

## 📄 লাইসেন্স (License)

MIT License © 2025-2026.
