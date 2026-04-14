import React, { useState } from "react"
import { X, Store, Star, MessageSquare, Shield, Bot, ArrowLeft, Link } from "lucide-react"

type Seller = {
  id: string
  name: string
  rating: number
  comments: number
  spamPercent: number
  reliability: number
  category: string
}

// Yuvarlak İlerleme Çubuğu (Senin Tasarımın)
function CircularProgress({
  percent, color, size = 80, strokeWidth = 6, label, showAnimation = true,
}: {
  percent: number; color: string; size?: number; strokeWidth?: number; label: string; showAnimation?: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
            strokeLinecap="round" strokeDasharray={circumference}
            strokeDashoffset={showAnimation ? offset : circumference}
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-800">%{percent}</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 mt-2 text-center">{label}</span>
    </div>
  )
}

const marketplaces = [
  {
    id: "trendyol",
    name: "Trendyol",
    logo: (
      <div className="w-20 h-20 bg-[#F27A1A] flex items-center justify-center rounded-lg">
        <span className="text-white font-bold text-sm">trendyol</span>
      </div>
    ),
    color: "#F27A1A",
    description: "Türkiye'nin lider e-ticaret platformu",
  }
  // Hepsiburada vb. şimdilik gizledik, sadece Trendyol'a odaklanıyoruz.
]

export default function App() {
  const [selectedMarketplace, setSelectedMarketplace] = useState<(typeof marketplaces)[0] | null>(null)
  const [showSellers, setShowSellers] = useState(false)
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null)
  const [productLink, setProductLink] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // API'YE BAĞLANAN SİHİRLİ FONKSİYON
  const handleAnalyze = async () => {
    if (!productLink) {
        alert("Lütfen bir Trendyol ürün linki yapıştırın!");
        return;
    }

    setIsLoading(true); // Yükleniyor animasyonunu başlat

    try {
        const response = await fetch('http://127.0.0.1:8000/analiz-et', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: productLink })
        });
        
        const data = await response.json();
        
        if (data.hata) {
            alert("Hata: " + data.hata);
        } else {
            // Python'dan gelen veriyi arayüze aktarıyoruz
            const newSeller: Seller = {
                id: "1",
                name: data.satici_adi,
                rating: 4.8, 
                comments: data.istatistikler.toplam_yorum,
                spamPercent: data.istatistikler.bot_yorum_sayisi,
                reliability: data.genel_guven_skoru,
                category: "Yapay Zeka Analiz Sonucu"
            };
            
            setSelectedSeller(newSeller);
            setShowSellers(true);
        }
    } catch (error) {
        alert("Bağlantı hatası! Arka planda Python API (main.py) çalışıyor mu?");
    } finally {
        setIsLoading(false);
    }
  }

  const handleBack = () => {
    if (selectedSeller) setSelectedSeller(null)
    else setShowSellers(false)
  }

  const handleClose = () => {
    setSelectedMarketplace(null)
    setShowSellers(false)
    setSelectedSeller(null)
    setProductLink("")
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl md:text-4xl font-serif text-[#1A1A4E] mb-8 tracking-wide">
        <span className="text-4xl md:text-5xl italic">M</span><span className="text-xl md:text-2xl tracking-widest">ARKETPLACE</span><span className="mx-2">&nbsp;</span>
        <span className="text-4xl md:text-5xl italic">A</span><span className="text-xl md:text-2xl tracking-widest">NALYSIS</span>
      </h1>

      <p className="text-[#1A1A4E] text-sm md:text-base tracking-wider mb-12 uppercase">
        Lütfen analiz etmek istediğiniz platformu seçin
      </p>

      <div className="flex flex-wrap gap-8 justify-center items-center">
        {marketplaces.map((marketplace) => (
          <button
            key={marketplace.id}
            onClick={() => setSelectedMarketplace(marketplace)}
            className="transform transition-all duration-300 hover:scale-110 hover:shadow-2xl rounded-lg focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-[#F5F0E8]"
            style={{ "--tw-ring-color": marketplace.color } as React.CSSProperties}
          >
            {marketplace.logo}
          </button>
        ))}
      </div>

      {selectedMarketplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-300" onClick={handleClose}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

          <div
            className={`relative bg-white rounded-2xl shadow-2xl p-8 mx-4 transform transition-all duration-300 animate-in fade-in zoom-in-95 ${
              showSellers ? "max-w-2xl w-full max-h-[80vh] overflow-y-auto" : "max-w-md w-full"
            }`}
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: `0 25px 50px -12px ${selectedMarketplace.color}40, 0 0 0 1px ${selectedMarketplace.color}20` }}
          >
            <div className="absolute top-4 right-4 flex gap-2">
              {showSellers && (
                <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
              )}
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {!showSellers && (
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 transform scale-150">{selectedMarketplace.logo}</div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: selectedMarketplace.color }}>{selectedMarketplace.name}</h2>
                <p className="text-gray-600 mb-4">{selectedMarketplace.description}</p>

                <div className="w-full mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Ürün Linki</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Link className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="url"
                      value={productLink}
                      onChange={(e) => setProductLink(e.target.value)}
                      placeholder={`${selectedMarketplace.name} ürün linkini yapıştırın...`}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-current transition-colors text-sm"
                      style={{ borderColor: productLink ? selectedMarketplace.color : undefined }}
                    />
                  </div>
                </div>

                <div className="flex gap-4 w-full">
                  <button
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    className="flex-1 py-3 px-6 rounded-lg text-white font-semibold transition-all duration-300 hover:opacity-90 hover:shadow-lg disabled:opacity-50"
                    style={{ backgroundColor: selectedMarketplace.color }}
                  >
                    {isLoading ? "Yapay Zeka Analiz Ediyor..." : "Analiz Et"}
                  </button>
                </div>
              </div>
            )}

            {showSellers && selectedSeller && (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                    style={{ backgroundColor: selectedMarketplace.color }}
                  >
                    {selectedSeller.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedSeller.name}</h2>
                    <p className="text-gray-500">{selectedSeller.category}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                    <span className="font-bold text-gray-800">{selectedSeller.rating}</span>
                    <span className="text-sm text-gray-500">Puan</span>
                  </div>
                  <div className="w-px h-6 bg-gray-300" />
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" style={{ color: selectedMarketplace.color }} />
                    <span className="font-bold text-gray-800">{selectedSeller.comments.toLocaleString()}</span>
                    <span className="text-sm text-gray-500">Yorum Çekildi</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <CircularProgress percent={selectedSeller.reliability} color="#22c55e" label="Güven Skoru (BERT)" size={90} />
                  <CircularProgress percent={selectedSeller.spamPercent} color="#ef4444" label="Elenen Bot/Spam" size={90} />
                  <CircularProgress percent={100 - selectedSeller.spamPercent} color={selectedMarketplace.color} label="Organik Yorum" size={90} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}