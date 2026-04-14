from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
from playwright.sync_api import sync_playwright
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from transformers import pipeline

app = FastAPI(title="E-Ticaret Web Analiz API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Yapay Zeka Modeli yükleniyor, lütfen bekleyin...")
duygu_analiz_modeli = pipeline("sentiment-analysis", model="savasy/bert-base-turkish-sentiment-cased")

class AnalizIstegi(BaseModel):
    url: str

def bot_filtresi(yorum_metinleri):
    # Eğer yorum sayısı çok azsa filtreleme yapma
    if len(yorum_metinleri) < 5: 
        return yorum_metinleri
    
    # 1. ADIM: Çok kısa yorumları filtreden muaf tut
    # Çünkü "Çok iyi" gibi kısa yorumlar doğal olarak birbirine benzer.
    uzun_yorumlar = [y for y in yorum_metinleri if len(y) > 30]
    kisa_yorumlar = [y for y in yorum_metinleri if len(y) <= 30]
    
    if len(uzun_yorumlar) < 2:
        return yorum_metinleri

    # 2. ADIM: Sadece uzun yorumlar arasında benzerlik tara
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(uzun_yorumlar)
    benzerlik = cosine_similarity(tfidf_matrix)
    
    temiz_liste = []
    silinenler = set()
    
    for i in range(len(benzerlik)):
        if i in silinenler: continue
        temiz_liste.append(uzun_yorumlar[i])
        for j in range(i + 1, len(benzerlik)):
            # ESKİ: 0.85 -> YENİ: 0.98 (Neredeyse kelimesi kelimesine aynıysa sil)
            if benzerlik[i][j] > 0.98: 
                silinenler.add(j)
    
    # 3. ADIM: Temizlenen uzun yorumlarla kısa yorumları birleştir
    print(f"Bot filtresi: {len(silinenler)} adet kopya yorum elendi.")
    return temiz_liste + kisa_yorumlar

@app.post("/analiz-et")
def analiz_et(istek: AnalizIstegi):
    if "trendyol.com" not in istek.url:
        raise HTTPException(status_code=400, detail="Sadece Trendyol destekleniyor.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        try:
            print(f"Siteye gidiliyor: {istek.url}")
            page.goto(istek.url, wait_until="domcontentloaded", timeout=60000)
            
            try:
                satici = page.inner_text(".seller-name-text", timeout=5000)
            except:
                satici = "Bilinmeyen Satıcı"
            
            # --- AYARLAR BURADA ---
            MAKSIMUM_TARAMA = 100   # Kaç kere aşağı inecek
            HEDEF_YORUM = 300      # Kaç yoruma ulaşınca duracak
            # ----------------------

            print("Derin tarama başlatıldı...")
            onceki_sayi = 0
            durma_sayaci = 0
            
            # YENİ: Yorumları yolda toplamak için ana sepetimizi (set) en başta oluşturuyoruz
            toplanan_yorumlar_sepeti = set()

            for i in range(MAKSIMUM_TARAMA):
                page.keyboard.press("PageDown")
                page.keyboard.press("PageDown")
                time.sleep(1.5) # Trendyol'un yüklemesi için kısa bir nefes
                
                # Sadece o an ekranda olanları çek
                anlik_metinler = page.locator(".review-comment, .comment-comment, .pr-rnr-com-w p, .comment-text, .review-text, .pr-rvw-elem").all_inner_texts()
                
                # Temizleyip "Ana Sepete" ekle. 
                # Set kullandığımız için aynı yorum 2 kez sepete girmez!
                for y in anlik_metinler:
                    temiz_yorum = y.strip()
                    if len(temiz_yorum) > 15:
                        toplanan_yorumlar_sepeti.add(temiz_yorum)
                
                # Güncel sayı artık sepetteki sayımız oldu
                guncel_sayi = len(toplanan_yorumlar_sepeti)
                
                print(f"Adım {i+1}: Sepetteki Benzersiz Yorum: {guncel_sayi}")

                if guncel_sayi >= HEDEF_YORUM:
                    print(f"Hedefe ({HEDEF_YORUM}) başarıyla ulaşıldı.")
                    break
                
                if guncel_sayi == onceki_sayi:
                    durma_sayaci += 1
                    if durma_sayaci >= 6: # 6 kez yeni bir şey bulamazsa pes et
                        print("Sayfa sonu veya yükleme limiti.")
                        break
                else:
                    durma_sayaci = 0
                    
                onceki_sayi = guncel_sayi

            ham_yorumlar = list(toplanan_yorumlar_sepeti)
            
            browser.close()

            if not ham_yorumlar:
                return {"hata": "Yorum bulunamadı."}

            print(f"Analiz başlıyor: {len(ham_yorumlar)} yorum...")
            organik_yorumlar = bot_filtresi(ham_yorumlar)
            bot_sayisi = len(ham_yorumlar) - len(organik_yorumlar)

            # --- ESKİ TOPLAM CEZA SİSTEMİ YERİNE YENİ HASSAS SİSTEM ---
            negatif_sayisi = 0
            pozitif_sayisi = 0
            
            # BERT'in kaçırabileceği kesin negatif kelimeler (İstediğin gibi ekle/çıkar)
            kapatma_listesi = ["berbat", "rezalet", "iğrenç", "çöp", "sakın", "bozuk", "sahte", "defolu", "iade"]

            for yorum in organik_yorumlar:
                sonuc = duygu_analiz_modeli(yorum[:512])[0]
                
                yorum_kucuk = yorum.lower()
                kara_listede_var_mi = any(kelime in yorum_kucuk for kelime in kapatma_listesi)
                
                # Eğer AI negatif dediyse VEYA kara listeden kelime geçiyorsa:
                if sonuc['label'] == 'NEGATIVE' or kara_listede_var_mi:
                    negatif_sayisi += 1
                else:
                    pozitif_sayisi += 1

            # --- YENİ YÜZDELİK SKOR HESAPLAMASI ---
            # (Pozitif Yorumlar / Tüm Organik Yorumlar) * 100
            if len(organik_yorumlar) > 0:
                guven_skoru = int((pozitif_sayisi / len(organik_yorumlar)) * 100)
            else:
                guven_skoru = 0

            # Sonuçları Frontend'e (React'a) Gönderiyoruz
            return {
                "satici_adi": satici,
                "genel_guven_skoru": guven_skoru,
                "istatistikler": {
                    "toplam_yorum": len(ham_yorumlar),
                    "bot_yorum_sayisi": bot_sayisi,
                    "analiz_edilen": len(organik_yorumlar),
                    "negatif_yorum": negatif_sayisi,  # React'ta göstermek istersin diye ekledik
                    "pozitif_yorum": pozitif_sayisi   # React'ta göstermek istersin diye ekledik
                },
                "kategori_skorlari": {
                    "orijinallik": guven_skoru + 5 if guven_skoru < 95 else 100,
                    "kargo": 90,
                    "iletisim": 95,
                    "paketleme": 88
                }
            }
            
        except Exception as e:
            if 'browser' in locals(): browser.close()
            return {"hata": f"Bir sorun oluştu: {str(e)}"}