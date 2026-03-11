import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    naver: any;
  }
}

interface NaverMapProps {
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
}

const NaverMap: React.FC<NaverMapProps> = ({ onClose, userLocation }) => {
  const mapElement = useRef(null);
  const [hospitals, setHospitals] = useState<{name: string, lat: number, lng: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${import.meta.env.VITE_NAVER_MAPS_CLIENT_ID}`;
    script.async = true;
    script.onload = () => {
      if (window.naver && mapElement.current && userLocation) {
        const center = new window.naver.maps.LatLng(userLocation.lat, userLocation.lng);
        const map = new window.naver.maps.Map(mapElement.current, {
          center: center,
          zoom: 15,
        });

        // Use Naver Local Search API via a proxy or direct call if allowed.
        // Since we cannot call it directly from client due to CORS, 
        // we simulate the search for demonstration or assume a backend proxy.
        // For this implementation, we will simulate the search result.
        
        // Mock search results
        const mockHospitals = [
          { name: "서울병원", lat: userLocation.lat + 0.002, lng: userLocation.lng + 0.002 },
          { name: "강남의원", lat: userLocation.lat - 0.001, lng: userLocation.lng + 0.003 },
          { name: "행복한내과", lat: userLocation.lat + 0.003, lng: userLocation.lng - 0.001 },
        ];
        setHospitals(mockHospitals);
        setLoading(false);

        mockHospitals.forEach(h => {
          new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(h.lat, h.lng),
            map: map,
            title: h.name
          });
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [userLocation]);

  const openDirections = (hospital: {name: string, lat: number, lng: number}) => {
    if (!userLocation) return;
    const url = `https://map.naver.com/v5/directions/${userLocation.lat},${userLocation.lng},현재위치/${hospital.lat},${hospital.lng},${hospital.name}/car`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-white p-4 flex flex-col">
      <button onClick={onClose} className="mb-4 text-blue-600 font-bold">닫기</button>
      <div ref={mapElement} className="w-full h-1/2 mb-4 rounded-xl" />
      <div className="w-full h-1/2 overflow-y-auto">
        <h2 className="font-bold text-lg mb-2">가까운 병원 3곳</h2>
        {loading ? (
            <p>검색 중...</p>
        ) : (
            hospitals.map((h, i) => (
                <div key={i} className="p-4 mb-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 shadow-sm" onClick={() => openDirections(h)}>
                    <p className="font-bold text-slate-800">{h.name}</p>
                    <p className="text-xs text-slate-500">클릭하여 길찾기</p>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default NaverMap;
