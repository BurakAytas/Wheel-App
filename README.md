# Çark Uygulaması (Wheel App)

Bu proje, kullanıcıların kayıt olup çark çevirebileceği bir web uygulamasıdır. PostgreSQL veritabanı kullanır ve admin paneli ile yönetilebilir.

## 🚀 Özellikler

- **Kullanıcı Kayıt Sistemi**: Ad, soyad ve e-posta ile kayıt
- **Çark Çevirme**: Kullanıcılar sadece bir kez çark çevirebilir
- **Admin Paneli**: Kayıtları görüntüleme, onaylama ve silme
- **Çark Yönetimi**: Bölümleri ve ağırlıklarını düzenleme
- **Kampanya Yönetimi**: Aktif kampanyaları yönetme
- **Resim Yönetimi**: Admin panelinde resim yükleme ve yönetme

## 🛠️ Teknolojiler

- **Backend**: Node.js, Express.js
- **Veritabanı**: PostgreSQL
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Güvenlik**: JWT, bcrypt, rate limiting, helmet
- **Dosya Yönetimi**: Multer

## 📋 Kurulum

### Gereksinimler
- Node.js (v16 veya üzeri)
- PostgreSQL (v12 veya üzeri)

### Adımlar

1. **Projeyi klonlayın:**
```bash
git clone <repository-url>
cd Wheel-App
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **PostgreSQL veritabanı oluşturun:**
```sql
CREATE DATABASE cark_uygulamasi;
```

4. **Environment dosyasını oluşturun:**
```bash
cp env.example .env
```

5. **`.env` dosyasını düzenleyin:**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/cark_uygulamasi
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
PORT=3000
```

6. **Uygulamayı başlatın:**
```bash
npm start
```

## 🔧 Yapılandırma

### Veritabanı
Uygulama ilk çalıştırıldığında otomatik olarak gerekli tabloları oluşturur:
- `users`: Kullanıcı bilgileri
- `spins`: Çark çevirme kayıtları
- `admins`: Admin kullanıcıları
- `wheel_sections`: Çark bölümleri
- `campaigns`: Kampanyalar

### Admin Erişimi
Varsayılan admin hesabı:
- **Kullanıcı adı**: admin
- **Şifre**: admin123

⚠️ **Güvenlik**: Üretim ortamında mutlaka admin şifresini değiştirin!

## 📁 Proje Yapısı

```
Wheel-App/
├── public/                 # Frontend dosyaları
│   ├── js/
│   │   └── utils.js       # Yardımcı fonksiyonlar
│   ├── images/            # Yüklenen resimler
│   ├── *.html             # HTML sayfaları
│   └── *.js               # JavaScript dosyaları
├── src/                   # Backend kaynak kodları
│   ├── db.js              # Veritabanı bağlantısı
│   └── routes/            # API rotaları
│       ├── auth.js        # Kimlik doğrulama
│       ├── user.js        # Kullanıcı işlemleri
│       └── admin.js       # Admin işlemleri
├── server.js              # Ana sunucu dosyası
├── package.json           # Proje bağımlılıkları
└── README.md              # Bu dosya
```

## 🔒 Güvenlik Özellikleri

- **Rate Limiting**: API isteklerini sınırlama
- **JWT Authentication**: Güvenli token tabanlı kimlik doğrulama
- **Input Validation**: Giriş verilerini doğrulama
- **SQL Injection Protection**: Prepared statements kullanımı
- **File Upload Security**: Sadece resim dosyalarına izin
- **CORS Protection**: Cross-origin istekleri kontrol etme
- **Helmet**: HTTP güvenlik başlıkları

## 🚀 Üretim Dağıtımı

1. **Environment değişkenlerini ayarlayın:**
```env
NODE_ENV=production
DATABASE_URL=your-production-database-url
JWT_SECRET=your-production-jwt-secret
```

2. **CORS ayarlarını güncelleyin:**
`server.js` dosyasında production domain'inizi ekleyin.

3. **PM2 ile çalıştırın:**
```bash
npm install -g pm2
pm2 start server.js --name "wheel-app"
```

## 📝 API Endpoints

### Kullanıcı Endpoints
- `POST /api/user/register` - Kullanıcı kaydı
- `POST /api/user/spin` - Çark çevirme
- `GET /api/user/wheel-sections` - Çark bölümlerini getir
- `GET /api/user/campaigns` - Aktif kampanyaları getir

### Admin Endpoints
- `POST /api/auth/login` - Admin girişi
- `GET /api/admin/spins` - Tüm çark kayıtları
- `POST /api/admin/spins/bulk-delete` - Toplu silme
- `GET /api/admin/wheel-sections` - Çark bölümlerini yönet
- `POST /api/admin/wheel-sections` - Çark bölümlerini güncelle
- `GET /api/admin/campaigns` - Kampanyaları yönet
- `POST /api/admin/upload-image` - Resim yükle

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆘 Sorun Giderme

### Veritabanı Bağlantı Hatası
- PostgreSQL servisinin çalıştığından emin olun
- `.env` dosyasındaki `DATABASE_URL`'i kontrol edin
- Veritabanı kullanıcısının doğru izinlere sahip olduğundan emin olun

### Port Zaten Kullanımda
- Farklı bir port kullanın: `PORT=3001 npm start`
- Kullanılan portu bulun ve kapatın: `lsof -ti:3000 | xargs kill -9`

### Resim Yükleme Hatası
- `public/images` klasörünün yazma izinlerini kontrol edin
- Dosya boyutunun 5MB'dan küçük olduğundan emin olun
