/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  ChevronRight, 
  ChevronLeft, 
  User, 
  ClipboardList, 
  Stethoscope, 
  Pill, 
  MapPin, 
  AlertCircle,
  CheckCircle2,
  Info,
  ArrowRight,
  Home,
  Bell,
  Search,
  MessageSquare,
  Navigation,
  Camera,
  Video,
  Mic,
  Image as ImageIcon,
  Trash2,
  Calendar,
  Clock,
  Share2
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Types
import { SymptomData, UserDetail, HealthHistory, DiagnosisResult, DiagnosisHistoryItem } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STEPS = ['Home', 'Symptoms', 'UserDetail', 'History', 'Result'];

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [nlInput, setNlInput] = useState('');
  
  // Form State
  const [symptoms, setSymptoms] = useState<SymptomData>({
    mainSymptom: '',
    intensity: 'normal',
    onset: 'today',
    accompanyingSymptoms: []
  });
  
  const [userDetail, setUserDetail] = useState<UserDetail>({
    age: 30,
    gender: 'male',
    isPregnant: false,
    weight: 70
  });
  
  const [history, setHistory] = useState<HealthHistory>({
    conditions: [],
    allergies: [],
    currentMeds: []
  });
  
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // New State for Media and Persistence
  const [mediaFiles, setMediaFiles] = useState<{ type: 'image' | 'video' | 'audio', data: string, name: string, mimeType: string }[]>([]);
  const [diagnosisHistory, setDiagnosisHistory] = useState<DiagnosisHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
  const [sessionVersion, setSessionVersion] = useState(0);
  const [isProfileSaved, setIsProfileSaved] = useState(false);
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

  const showToast = (message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: '', show: false }), 3000);
  };

  // Load data from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('medi_ai_profile');
    if (savedProfile) {
      setUserDetail(JSON.parse(savedProfile));
      setIsProfileSaved(true);
    }

    const savedHistory = localStorage.getItem('medi_ai_history');
    if (savedHistory) {
      setDiagnosisHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save profile whenever it changes
  useEffect(() => {
    if (isProfileSaved) {
      localStorage.setItem('medi_ai_profile', JSON.stringify(userDetail));
    }
  }, [userDetail, isProfileSaved]);

  const handleSaveProfile = () => {
    localStorage.setItem('medi_ai_profile', JSON.stringify(userDetail));
    setIsProfileSaved(true);
    alert('프로필 정보가 저장되었습니다.');
  };

  // Save history whenever it changes
  useEffect(() => {
    localStorage.setItem('medi_ai_history', JSON.stringify(diagnosisHistory));
  }, [diagnosisHistory]);

  const nextStep = () => {
    if (currentStep === 1 && isProfileSaved) {
      setCurrentStep(3);
    } else {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };
  const prevStep = () => {
    if (currentStep === 3 && isProfileSaved) {
      setCurrentStep(1);
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 0));
    }
  };

  const handleDiagnosis = async () => {
    setLoading(true);
    console.log("Starting diagnosis...");
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `
        사용자 건강 데이터를 기반으로 질병 가능성을 분석하고 건강 가이드를 제공해주세요.
        
        [중요 지침]
        1. 사용자가 제공한 주요 증상이 사진이나 미디어 분석을 통해 얻어진 경우, 해당 부위(예: 팔, 다리 등)와 시각적 특징(상처, 발진 등)을 바탕으로 가능한 질환을 분석하세요.
        2. 정보가 다소 부족하더라도 증상의 특징(위치, 모양, 강도)을 고려하여 가장 가능성 높은 질환들을 제시하세요.
        3. '증상정보부족'과 같은 답변 대신, 현재 정보로 추론 가능한 최선의 분석 결과를 제공하세요.
        
        [사용자 데이터]
        - 주요 증상: ${symptoms.mainSymptom}
        - 증상 강도: ${symptoms.intensity}
        - 증상 시작: ${symptoms.onset}
        - 동반 증상: ${symptoms.accompanyingSymptoms.join(', ')}
        - 나이: ${userDetail.age}
        - 성별: ${userDetail.gender}
        - 임신 여부: ${userDetail.isPregnant ? '예' : '아니오'}
        - 체중: ${userDetail.weight}kg
        - 기존 질환: ${history.conditions.join(', ')}
        - 알레르기: ${history.allergies.join(', ')}
        - 현재 복용 약: ${history.currentMeds.join(', ')}

        [출력 형식]
        반드시 JSON 형식으로만 응답해주세요.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              diseases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    probability: { type: Type.NUMBER },
                    description: { type: Type.STRING }
                  },
                  required: ["name", "probability", "description"]
                }
              },
              riskLevel: { type: Type.STRING, enum: ["low", "medium", "high"] },
              recommendations: {
                type: Type.OBJECT,
                properties: {
                  meds: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        effect: { type: Type.STRING },
                        usage: { type: Type.STRING },
                        sideEffects: { type: Type.STRING }
                      }
                    }
                  },
                  lifestyle: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              hospitalVisit: {
                type: Type.OBJECT,
                properties: {
                  necessity: { type: Type.STRING, enum: ["low", "medium", "high"] },
                  reason: { type: Type.STRING },
                  department: { type: Type.STRING }
                }
              },
              confidence: { type: Type.STRING, enum: ["low", "medium", "high"] }
            },
            required: ["diseases", "riskLevel", "recommendations", "hospitalVisit", "confidence"]
          }
        }
      });

      console.log("Diagnosis received.");
      const data = JSON.parse(response.text || '{}');
      setResult(data);
      
      // Save to history
      const historyItem: DiagnosisHistoryItem = {
        id: Math.random().toString(36).substring(2, 11),
        timestamp: new Date().toISOString(),
        symptoms: { ...symptoms },
        result: data
      };
      setDiagnosisHistory(prev => {
        const newHistory = [historyItem, ...prev];
        localStorage.setItem('medi_ai_history', JSON.stringify(newHistory));
        return newHistory;
      });

      nextStep(); // Move to result step immediately
      
      // Search for nearby hospitals asynchronously after showing results
      if (data.hospitalVisit.department) {
        console.log("Searching for hospitals for:", data.hospitalVisit.department);
        try {
          // Get current location with a shorter timeout
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            if (!navigator.geolocation) {
              reject(new Error("Geolocation not supported"));
              return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              timeout: 5000, // 5 seconds timeout
              enableHighAccuracy: false 
            });
          });
          
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          console.log("Location obtained:", latitude, longitude);
          
          const mapsResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Find 3 real hospitals or clinics for ${data.hospitalVisit.department} near my current location (${latitude}, ${longitude}). 
            For each hospital, provide its name, address, and latitude/longitude.
            Format the output as a JSON list inside the text: [ { "name": "...", "address": "...", "lat": 0.0, "lng": 0.0 } ]`,
            config: {
              tools: [{ googleMaps: {} }],
              toolConfig: {
                retrievalConfig: {
                  latLng: { latitude, longitude }
                }
              }
            }
          });
          
          console.log("Hospital data received.");
          const match = mapsResponse.text.match(/\[\s*\{.*\}\s*\]/s);
          const updatedResult = { ...data };
          if (match) {
            try {
              (updatedResult as any).nearbyHospitalsData = JSON.parse(match[0]);
            } catch (e) {
              console.error("Failed to parse hospital JSON", e);
            }
          }
          (updatedResult as any).nearbyHospitals = mapsResponse.text;
          (updatedResult as any).groundingChunks = mapsResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
          setResult(updatedResult);
        } catch (e) {
          console.warn("Hospital search or geolocation failed:", e);
          // Fallback to simple search without location if geolocation fails
          try {
            const searchResponse = await ai.models.generateContent({
              model: "gemini-3.1-pro-preview",
              contents: `Find 3 real hospitals or clinics for ${data.hospitalVisit.department} in South Korea. Provide their names and addresses.`,
              config: {
                tools: [{ googleSearch: {} }]
              }
            });
            setResult(prev => ({
              ...prev!,
              nearbyHospitals: searchResponse.text
            } as any));
          } catch (e2) {
            console.error("Fallback search failed", e2);
          }
        }
      }
    } catch (error) {
      console.error("Diagnosis failed:", error);
      alert("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        let type: 'image' | 'video' | 'audio' = 'image';
        if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        
        setMediaFiles(prev => [...prev, { type, data: base64String, name: file.name, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtractSymptoms = async () => {
    if (!nlInput.trim() && mediaFiles.length === 0) return;
    setExtracting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `
        사용자가 설명한 증상 텍스트(및 첨부된 이미지/오디오/비디오)에서 주요 증상, 강도, 시작 시점, 동반 증상을 추출해주세요.
        
        [중요 지침]
        1. 텍스트 입력이 없더라도 첨부된 이미지, 오디오, 비디오 파일을 면밀히 분석하여 증상을 파악해 주세요.
        2. 이미지에 발진, 부기, 상처, 안색 변화, 통증 부위를 가리키는 동작 등 시각적 증상이 보인다면 이를 'mainSymptom'으로 구체적으로 기술하세요.
        3. 오디오에서 기침 소리, 거친 숨소리, 쉰 목소리, 통증으로 인한 신음 등이 들린다면 이를 증상에 반영하세요.
        4. 정보가 부족하더라도 미디어에서 유추할 수 있는 최선의 추측을 제공하세요. 절대로 '증상 없음'으로 결론짓지 마세요.
        5. 'description' 필드에는 미디어 파일을 분석한 내용을 바탕으로 사용자가 직접 자신의 상태를 설명하는 것 같은 자연스러운 1인칭 문장으로 작성해 주세요. (예: "팔에 붉은 반점이 생기고 가려워요")
        
        텍스트: "${nlInput}"
        
        [추출 규칙]
        - description: 미디어 분석을 통한 상세한 증상 설명 (문자열)
        - mainSymptom: 가장 핵심적인 증상 하나 (문자열)
        - intensity: 'weak' (약함), 'normal' (보통), 'severe' (심함) 중 하나
        - onset: '오늘', '1~2일', '3일 이상' 중 하나
        - accompanyingSymptoms: 언급된 다른 증상들의 배열 (예: ["두통", "발열"])
      `;

      const parts: any[] = [{ text: prompt }];
      mediaFiles.forEach(f => {
        parts.push({
          inlineData: {
            mimeType: f.mimeType,
            data: f.data
          }
        });
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              mainSymptom: { type: Type.STRING },
              intensity: { type: Type.STRING, enum: ["weak", "normal", "severe"] },
              onset: { type: Type.STRING, enum: ["오늘", "1~2일", "3일 이상"] },
              accompanyingSymptoms: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["description", "mainSymptom", "intensity", "onset", "accompanyingSymptoms"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      
      const isMediaOnly = !nlInput.trim() && mediaFiles.length > 0;
      
      if (isMediaOnly && data.description) {
        setNlInput(data.description);
      } else if (!isMediaOnly) {
        setNlInput('');
      }

      setSymptoms({
        mainSymptom: data.mainSymptom || '',
        intensity: data.intensity || 'normal',
        onset: data.onset || '오늘',
        accompanyingSymptoms: data.accompanyingSymptoms || []
      });
      
      setMediaFiles([]);
    } catch (error) {
      console.error("Extraction failed:", error);
      alert("증상 추출 중 오류가 발생했습니다. 직접 입력해주세요.");
    } finally {
      setExtracting(false);
    }
  };

  const handleDirections = async (hospital: any) => {
    try {
      let lat = userLocation?.lat;
      let lng = userLocation?.lng;

      // 위치 정보가 없으면 새로 요청
      if (!lat || !lng) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            timeout: 5000,
            enableHighAccuracy: true 
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        setUserLocation({ lat, lng });
      }

      // 네이버 지도 길찾기 URL (명시적 좌표 방식)
      // 형식: https://map.naver.com/v5/directions/출발LNG,출발LAT,출발명/도착LNG,도착LAT,도착명/이동수단
      // 네이버는 경도(lng), 위도(lat) 순서를 선호합니다.
      const start = `${lng},${lat},${encodeURIComponent('내 위치')}`;
      const end = `${hospital.lng},${hospital.lat},${encodeURIComponent(hospital.name)}`;
      const url = `https://map.naver.com/v5/directions/${start}/${end}/-`;
      
      console.log("Opening directions URL:", url);
      window.open(url, '_blank');
    } catch (error) {
      console.error("Directions failed:", error);
      alert("현재 위치를 가져올 수 없어 길찾기를 시작할 수 없습니다. 브라우저의 위치 권한을 확인해주세요.");
      // 위치 정보 실패 시 검색 결과로 대체
      window.open(`https://map.naver.com/v5/search/${encodeURIComponent(hospital.name)}`, '_blank');
    }
  };

  const handleShare = async () => {
    if (!result) return;

    const diseases = result.diseases.map(d => `${d.name}(${Math.round(d.probability * 100)}%)`).join(', ');
    const meds = result.recommendations.meds.map(m => m.name).join(', ');
    
    const shareText = `[MediAI 분석 결과]\n\n주요 증상: ${symptoms.mainSymptom}\n추정 질환: ${diseases}\n권장 진료과: ${result.hospitalVisit.department}\n추천 약: ${meds}\n\n* 본 결과는 참고용이며, 정확한 진단은 전문의와 상의하세요.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MediAI 분석 결과',
          text: shareText,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Sharing failed:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('분석 결과가 클립보드에 복사되었습니다.');
      } catch (error) {
        console.error('Clipboard copy failed:', error);
        alert('공유 기능을 사용할 수 없습니다.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-lg tracking-tight text-slate-800">
            {currentStep === 0 ? (
              activeTab === 'home' ? 'MediAI' : 
              activeTab === 'history' ? '진료 기록' : '내 정보'
            ) : 'MediAI'}
          </h1>
        </div>
        <div className="flex gap-3">
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {currentStep === 0 && activeTab === 'home' && (
            <motion.div 
              key={`home-${sessionVersion}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                  안녕하세요, 고객님!<br />
                  오늘 몸 상태는 어떠신가요?
                </h2>
                <p className="text-slate-500 text-sm">AI가 당신의 증상을 분석하고 맞춤 가이드를 제공합니다.</p>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-800">의학적 면책 조항</p>
                  <p className="text-[10px] text-amber-700 leading-relaxed">
                    본 서비스는 전문적인 의료 진단을 대신할 수 없으며, 정확한 진단은 전문의와 상의하십시오.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <MenuCard icon={<Stethoscope className="text-blue-500" />} title="질환 추정" desc="증상을 통해 예상 질환 확인" onClick={nextStep} />
                <MenuCard icon={<Pill className="text-emerald-500" />} title="약 추천" desc="증상에 맞는 상비약 안내" onClick={() => setCurrentStep(10)} />
                <MenuCard icon={<MapPin className="text-purple-500" />} title="주변 병원" desc="가까운 전문 병원 찾기" onClick={() => window.open('https://map.naver.com/v5/search/' + encodeURIComponent('주변 병원'), '_blank')} />
                <MenuCard 
                  icon={<ClipboardList className="text-orange-500" />} 
                  title="건강 가이드" 
                  desc="맞춤형 건강 생활 팁" 
                  onClick={() => {
                    if (!isProfileSaved) {
                      showToast('내 정보를 먼저 입력해주세요.');
                      setActiveTab('profile');
                    } else {
                      setCurrentStep(11);
                    }
                  }} 
                />
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full overflow-hidden border-4 border-white shadow-inner">
                  <img src="https://picsum.photos/seed/doctor/200" alt="Doctor" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800">AI 증상 분석기</h3>
                  <p className="text-xs text-slate-500">대화형 AI를 통해 당신의 현재 증상을 정밀하게 분석해보세요.</p>
                </div>
                <button 
                  onClick={nextStep}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  <Activity className="w-5 h-5" />
                  증상 분석 시작하기
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 0 && activeTab === 'history' && (
            <motion.div 
              key={`history-${sessionVersion}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">진료 기록</h2>
                <p className="text-slate-500 text-sm">과거에 분석했던 증상과 결과를 확인하세요.</p>
              </div>

              {diagnosisHistory.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                    <ClipboardList className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-400">아직 저장된 진료 기록이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {diagnosisHistory.map((item) => (
                    <button 
                      key={item.id}
                      onClick={() => {
                        setResult(item.result);
                        setSymptoms(item.symptoms);
                        setCurrentStep(4);
                      }}
                      className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-start text-left space-y-3 hover:border-blue-200 transition-all group"
                    >
                      <div className="w-full flex justify-between items-start">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleDateString()}
                          <Clock className="w-3 h-3 ml-1" />
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                          item.result.riskLevel === 'high' ? "bg-red-50 text-red-600" : 
                          item.result.riskLevel === 'medium' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {item.result.riskLevel === 'high' ? '위험' : item.result.riskLevel === 'medium' ? '주의' : '안전'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800">{item.symptoms.mainSymptom}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {item.result.diseases.map(d => d.name).join(', ')}
                        </p>
                      </div>
                      <div className="w-full pt-3 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[10px] text-blue-600 font-bold">상세 결과 보기</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 0 && activeTab === 'profile' && (
            <motion.div 
              key={`profile-${sessionVersion}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">내 정보</h2>
                <p className="text-slate-500 text-sm">정확한 분석을 위해 기본 정보를 입력해주세요.</p>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">나이</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" min="1" max="100" 
                      className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      value={userDetail.age}
                      onChange={(e) => {
                        setUserDetail({...userDetail, age: parseInt(e.target.value)});
                        setIsProfileSaved(false);
                      }}
                    />
                    <span className="w-12 text-center font-bold text-blue-600">{userDetail.age}세</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">성별</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                        setUserDetail({...userDetail, gender: 'male'});
                        setIsProfileSaved(false);
                      }}
                      className={cn(
                        "py-3 rounded-xl text-sm font-bold border transition-all",
                        userDetail.gender === 'male' ? "bg-blue-50 border-blue-600 text-blue-600" : "bg-white border-slate-200 text-slate-500"
                      )}
                    >
                      남성
                    </button>
                    <button 
                      onClick={() => {
                        setUserDetail({...userDetail, gender: 'female'});
                        setIsProfileSaved(false);
                      }}
                      className={cn(
                        "py-3 rounded-xl text-sm font-bold border transition-all",
                        userDetail.gender === 'female' ? "bg-pink-50 border-pink-600 text-pink-600" : "bg-white border-slate-200 text-slate-500"
                      )}
                    >
                      여성
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">체중 (kg)</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800"
                    value={userDetail.weight}
                    onChange={(e) => {
                      setUserDetail({...userDetail, weight: parseInt(e.target.value) || 0});
                      setIsProfileSaved(false);
                    }}
                  />
                </div>

                {userDetail.gender === 'female' && (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <label className="text-sm font-bold text-slate-700">임신 여부</label>
                    <button 
                      onClick={() => {
                        setUserDetail({...userDetail, isPregnant: !userDetail.isPregnant});
                        setIsProfileSaved(false);
                      }}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        userDetail.isPregnant ? "bg-blue-600" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        userDetail.isPregnant ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                )}

                {!isProfileSaved && (
                  <button 
                    onClick={handleSaveProfile}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                  >
                    프로필 정보 저장하기
                  </button>
                )}
                {isProfileSaved && (
                  <div className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-center flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    프로필 정보가 저장됨
                  </div>
                )}
              </div>

              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
                <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-red-800">데이터 초기화</p>
                  <p className="text-[10px] text-red-700 leading-relaxed">
                    저장된 모든 진료 기록과 프로필 정보를 삭제합니다.
                  </p>
                  <button 
                    onClick={() => {
                      if (confirm('정말 모든 데이터를 삭제하시겠습니까?')) {
                        // 1. 로컬 스토리지 완전 삭제
                        localStorage.clear();
                        
                        // 2. 상태 초기화 (자동 저장 방지)
                        setIsProfileSaved(false);
                        setDiagnosisHistory([]);
                        setUserDetail({ age: 30, gender: 'male', isPregnant: false, weight: 70 });
                        setHistory({ conditions: [], allergies: [], currentMeds: [] });
                        setSymptoms({ mainSymptom: '', intensity: 'normal', onset: 'today', accompanyingSymptoms: [] });
                        setMediaFiles([]);
                        setResult(null);
                        
                        // 3. 세션 버전 업데이트 (모든 탭 강제 리마운트)
                        setSessionVersion(v => v + 1);
                        
                        // 4. 홈 탭으로 이동
                        setActiveTab('home');
                        setCurrentStep(0);
                        
                        showToast('모든 데이터가 삭제되었습니다.');
                      }
                    }}
                    className="mt-3 w-full py-3 bg-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    모든 데이터 삭제하기
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div 
              key="symptoms"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <StepHeader title="증상 입력" onBack={prevStep} />
              
              <div className="space-y-6">
                {/* NLP Input Section */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    증상을 자유롭게 설명해주세요
                  </label>
                  <div className="relative">
                    <textarea 
                      placeholder="예: 어제부터 머리가 너무 아프고 열이 나는 것 같아요. 콧물도 조금 나요."
                      className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[120px] text-sm resize-none pb-12"
                      value={nlInput}
                      onChange={(e) => setNlInput(e.target.value)}
                    />
                    
                    {/* Media Preview */}
                    {mediaFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-white/50 border-t border-blue-100">
                        {mediaFiles.map((file, idx) => (
                          <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-blue-200">
                            {file.type === 'image' ? (
                              <img src={`data:image/jpeg;base64,${file.data}`} className="w-full h-full object-cover" alt="preview" />
                            ) : (
                              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                <Video className="w-4 h-4 text-white" />
                              </div>
                            )}
                            <button 
                              onClick={() => removeMedia(idx)}
                              className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-lg"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 flex gap-2">
                      <label className="p-2 bg-white text-slate-500 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                        <Camera className="w-4 h-4" />
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                      </label>
                      <label className="p-2 bg-white text-slate-500 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                        <ImageIcon className="w-4 h-4" />
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
                      </label>
                      <label className="p-2 bg-white text-slate-500 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                        <Video className="w-4 h-4" />
                        <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                      </label>
                      <label className="p-2 bg-white text-slate-500 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                        <Mic className="w-4 h-4" />
                        <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </div>

                    <button 
                      onClick={handleExtractSymptoms}
                      disabled={extracting || (!nlInput.trim() && mediaFiles.length === 0)}
                      className="absolute bottom-3 right-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center gap-2"
                    >
                      {extracting ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Search className="w-3 h-3" />
                      )}
                      분석 및 자동 입력
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 px-1">입력하신 내용을 바탕으로 아래 항목들이 자동으로 채워집니다.</p>
                </div>

                <div className="border-b border-slate-100" />

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">증상 강도 <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-1 gap-2">
                    <SelectButton 
                      active={symptoms.intensity === 'weak'} 
                      onClick={() => setSymptoms({...symptoms, intensity: 'weak'})}
                      title="약함" desc="일상생활 가능"
                    />
                    <SelectButton 
                      active={symptoms.intensity === 'normal'} 
                      onClick={() => setSymptoms({...symptoms, intensity: 'normal'})}
                      title="보통" desc="다소 불편함"
                    />
                    <SelectButton 
                      active={symptoms.intensity === 'severe'} 
                      onClick={() => setSymptoms({...symptoms, intensity: 'severe'})}
                      title="심함" desc="일상생활 어려움"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">증상 시작 시점 <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {['오늘', '1~2일', '3일 이상'].map((opt) => (
                      <button 
                        key={opt}
                        onClick={() => setSymptoms({...symptoms, onset: opt as any})}
                        className={cn(
                          "py-3 rounded-xl text-sm font-medium border transition-all",
                          symptoms.onset === opt ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-500"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">동반 증상 (선택)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['두통', '어지러움', '구토', '설사', '발열', '근육통'].map((s) => (
                      <button 
                        key={s}
                        onClick={() => {
                          const next = symptoms.accompanyingSymptoms.includes(s)
                            ? symptoms.accompanyingSymptoms.filter(x => x !== s)
                            : [...symptoms.accompanyingSymptoms, s];
                          setSymptoms({...symptoms, accompanyingSymptoms: next});
                        }}
                        className={cn(
                          "py-3 px-4 rounded-xl text-xs font-medium border flex items-center justify-between transition-all",
                          symptoms.accompanyingSymptoms.includes(s) ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-500"
                        )}
                      >
                        {s}
                        {symptoms.accompanyingSymptoms.includes(s) && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={nextStep}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100"
              >
                다음으로
              </button>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div 
              key="user-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <StepHeader title="기본 정보 입력" onBack={prevStep} />
              
              <div className="space-y-6">
                {!isProfileSaved && (
                  <>
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">나이</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" min="0" max="100" 
                          className="flex-1 accent-blue-600"
                          value={userDetail.age}
                          onChange={(e) => setUserDetail({...userDetail, age: parseInt(e.target.value)})}
                        />
                        <span className="w-12 text-center font-bold text-blue-600">{userDetail.age}세</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">성별</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['남성', '여성'].map((g) => (
                          <button 
                            key={g}
                            onClick={() => setUserDetail({...userDetail, gender: g === '남성' ? 'male' : 'female'})}
                            className={cn(
                              "py-4 rounded-2xl font-bold border transition-all",
                              (userDetail.gender === 'male' && g === '남성') || (userDetail.gender === 'female' && g === '여성')
                                ? "bg-blue-600 border-blue-600 text-white shadow-md"
                                : "bg-white border-slate-200 text-slate-500"
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700">체중 (kg)</label>
                      <input 
                        type="number" 
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                        value={userDetail.weight}
                        onChange={(e) => setUserDetail({...userDetail, weight: parseInt(e.target.value)})}
                      />
                    </div>
                  </>
                )}

                {userDetail.gender === 'female' && (
                  <div className="p-4 bg-blue-50 rounded-2xl flex items-center justify-between">
                    <label className="text-sm font-bold text-blue-800">임신 여부</label>
                    <button 
                      onClick={() => setUserDetail({...userDetail, isPregnant: !userDetail.isPregnant})}
                      className={cn(
                        "w-12 h-6 rounded-full relative transition-all",
                        userDetail.isPregnant ? "bg-blue-600" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        userDetail.isPregnant ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={nextStep}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100"
              >
                다음으로
              </button>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <StepHeader title="질환 및 알레르기" onBack={prevStep} />
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-blue-500" />
                    기존 질환
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {['고혈압', '당뇨', '간 질환', '신장 질환', '천식'].map((c) => (
                      <CheckTag 
                        key={c} label={c} 
                        checked={history.conditions.includes(c)}
                        onChange={() => {
                          const next = history.conditions.includes(c)
                            ? history.conditions.filter(x => x !== c)
                            : [...history.conditions, c];
                          setHistory({...history, conditions: next});
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    알레르기 정보
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {['페니실린', 'NSAID', '꽃가루', '먼지', '특정 성분'].map((a) => (
                      <CheckTag 
                        key={a} label={a} 
                        checked={history.allergies.includes(a)}
                        onChange={() => {
                          const next = history.allergies.includes(a)
                            ? history.allergies.filter(x => x !== a)
                            : [...history.allergies, a];
                          setHistory({...history, allergies: next});
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-emerald-500" />
                    현재 복용 약
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {['감기약', '항생제', '혈압약', '진통제'].map((m) => (
                      <CheckTag 
                        key={m} label={m} 
                        checked={history.currentMeds.includes(m)}
                        onChange={() => {
                          const next = history.currentMeds.includes(m)
                            ? history.currentMeds.filter(x => x !== m)
                            : [...history.currentMeds, m];
                          setHistory({...history, currentMeds: next});
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleDiagnosis}
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      분석 결과 보기
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 4 && result && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 space-y-8"
            >
              <div className="flex items-center justify-between">
                <button onClick={() => setCurrentStep(0)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="font-bold text-slate-800">분석 결과</h2>
                <button onClick={handleShare} className="p-2 -mr-2 text-blue-600 hover:text-blue-700 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {/* Disease Summary */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <Stethoscope className="w-5 h-5" />
                  <h3 className="font-bold">추정 질환</h3>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
                  {result.diseases.map((d, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold">
                            {i + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">{d.name}</h4>
                            <p className="text-[10px] text-slate-400">일치 확률: {Math.round(d.probability * 100)}%</p>
                          </div>
                        </div>
                        <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${d.probability * 100}%` }}
                            className="h-full bg-blue-500"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{d.description}</p>
                      {i < result.diseases.length - 1 && <div className="border-b border-slate-50 pt-2" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Meds Recommendation */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Pill className="w-5 h-5" />
                  <h3 className="font-bold">권장 일반 의약품</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {result.recommendations.meds.map((m, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
                      <div className="w-full aspect-square bg-slate-50 rounded-xl flex items-center justify-center">
                        <Pill className="w-8 h-8 text-slate-300" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800">{m.name}</h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{m.effect}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lifestyle Guide */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-600">
                  <ClipboardList className="w-5 h-5" />
                  <h3 className="font-bold">생활 습관 가이드</h3>
                </div>
                <div className="space-y-2">
                  {result.recommendations.lifestyle.map((l, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hospital Visit */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-purple-600">
                  <MapPin className="w-5 h-5" />
                  <h3 className="font-bold">권장 진료과</h3>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                      <Home className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{result.hospitalVisit.department}</h4>
                      <p className="text-[10px] text-slate-500">일반 진단 및 진료용</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.open(`https://map.naver.com/v5/search/${encodeURIComponent(result.hospitalVisit.department)}`, '_blank')}
                    className="text-xs font-bold text-blue-600 flex items-center gap-1"
                  >
                    병원 찾기 <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Nearby Hospitals */}
              {(result as any).nearbyHospitals && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <MapPin className="w-5 h-5" />
                    <h3 className="font-bold">주변 병원</h3>
                  </div>
                  
                  {/* Hospital List - Simple Names */}
                  {(result as any).nearbyHospitalsData ? (
                    <div className="grid grid-cols-1 gap-3">
                      {(result as any).nearbyHospitalsData.map((h: any, idx: number) => (
                        <button 
                          key={idx}
                          onClick={() => handleDirections(h)}
                          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <Navigation className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                              <h4 className="font-bold text-slate-800">{h.name}</h4>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{h.address}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                      <div className="prose prose-slate prose-xs max-w-none text-slate-600">
                        <ReactMarkdown>{(result as any).nearbyHospitals}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Warning */}
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-[10px] text-red-800 leading-relaxed">
                  주의: AI 분석은 참고용입니다. 증상이 지속되거나 악화될 경우 반드시 의료 전문가와 상담하세요.
                </p>
              </div>

              <button 
                onClick={() => setCurrentStep(0)}
                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold"
              >
                처음으로 돌아가기
              </button>
            </motion.div>
          )}

          {currentStep === 10 && (
            <motion.div 
              key="meds-page"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <StepHeader title="상비약 안내" onBack={() => setCurrentStep(0)} />
              
              <div className="space-y-6">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-3">
                  <Info className="w-5 h-5 text-emerald-500 shrink-0" />
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    증상별로 흔히 사용되는 일반 의약품(OTC) 안내입니다. 복용 전 반드시 약사와 상의하세요.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    { 
                      category: '해열/진통', 
                      icon: <Activity className="w-4 h-4 text-red-500" />,
                      meds: [
                        { name: '타이레놀 (아세트아미노펜)', desc: '해열 및 두통, 치통, 근육통 완화' },
                        { name: '애드빌/부루펜 (이부프로펜)', desc: '소염 작용이 있는 진통제' }
                      ]
                    },
                    { 
                      category: '감기/기침', 
                      icon: <Activity className="w-4 h-4 text-blue-500" />,
                      meds: [
                        { name: '판피린/판콜', desc: '종합 감기약 (초기 감기)' },
                        { name: '코대원/용각산', desc: '기침, 가래 완화' }
                      ]
                    },
                    { 
                      category: '소화/위장', 
                      icon: <Activity className="w-4 h-4 text-emerald-500" />,
                      meds: [
                        { name: '훼스탈/베아제', desc: '소화 불량 및 과식' },
                        { name: '개비스콘/알마겔', desc: '속쓰림 및 위산 역류' }
                      ]
                    },
                    { 
                      category: '피부/외상', 
                      icon: <Activity className="w-4 h-4 text-orange-500" />,
                      meds: [
                        { name: '후시딘/마데카솔', desc: '상처 감염 예방 및 재생' },
                        { name: '버물리/써버쿨', desc: '벌레 물린 곳, 가려움 완화' }
                      ]
                    }
                  ].map((cat, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 rounded-lg">
                          {cat.icon}
                        </div>
                        <h3 className="font-bold text-slate-800">{cat.category}</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {cat.meds.map((m, j) => (
                          <div key={j} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">{m.name}</h4>
                              <p className="text-[10px] text-slate-500">{m.desc}</p>
                            </div>
                            <button 
                              onClick={() => window.open(`https://search.naver.com/search.naver?query=${encodeURIComponent(m.name)}`, '_blank')}
                              className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 11 && (
            <motion.div 
              key="health-guide-page"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-8"
            >
              <StepHeader title="맞춤형 건강 가이드" onBack={() => setCurrentStep(0)} />
              
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{userDetail.age}세 {userDetail.gender === 'male' ? '남성' : '여성'} 고객님</h3>
                      <p className="text-xs opacity-80">당신만을 위한 맞춤 건강 팁입니다.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Age-based Guide */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 text-orange-600 font-bold">
                      <Calendar className="w-5 h-5" />
                      연령대별 핵심 관리
                    </div>
                    <div className="space-y-3">
                      {userDetail.age < 20 ? (
                        <p className="text-sm text-slate-600 leading-relaxed">성장기에는 균형 잡힌 영양 섭취와 충분한 수면이 가장 중요합니다. 특히 척추 건강을 위해 바른 자세를 유지하고 스마트폰 사용 시간을 조절하세요.</p>
                      ) : userDetail.age < 40 ? (
                        <p className="text-sm text-slate-600 leading-relaxed">사회 활동이 활발한 시기인 만큼 스트레스 관리와 규칙적인 운동이 필수입니다. 장시간 앉아 있는 경우 1시간마다 스트레칭을 생활화하세요.</p>
                      ) : userDetail.age < 60 ? (
                        <p className="text-sm text-slate-600 leading-relaxed">심혈관 질환 예방을 위해 정기적인 건강검진이 필요한 시기입니다. 근력 저하를 막기 위해 단백질 섭취를 늘리고 근력 운동을 병행하세요.</p>
                      ) : (
                        <p className="text-sm text-slate-600 leading-relaxed">관절 건강과 인지 기능 유지에 집중해야 합니다. 가벼운 산책과 함께 두뇌 활동을 돕는 취미 생활을 즐기시고, 낙상 사고에 유의하세요.</p>
                      )}
                    </div>
                  </div>

                  {/* Gender/Condition-based Guide */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 text-blue-600 font-bold">
                      <Activity className="w-5 h-5" />
                      특이 사항별 가이드
                    </div>
                    <div className="space-y-3">
                      {userDetail.isPregnant ? (
                        <div className="p-4 bg-pink-50 rounded-2xl border border-pink-100">
                          <p className="text-sm text-pink-800 font-bold mb-1">임산부 건강 관리</p>
                          <p className="text-xs text-pink-700 leading-relaxed">엽산과 철분을 충분히 섭취하시고, 무리하지 않는 선에서 가벼운 걷기 운동을 추천합니다. 정기적인 산부인과 검진을 잊지 마세요.</p>
                        </div>
                      ) : userDetail.gender === 'female' ? (
                        <p className="text-sm text-slate-600 leading-relaxed">여성 건강을 위해 철분과 칼슘 섭취에 신경 쓰세요. 주기적인 자가 검진과 함께 호르몬 변화에 따른 심리적 안정을 취하는 것이 좋습니다.</p>
                      ) : (
                        <p className="text-sm text-slate-600 leading-relaxed">남성 건강을 위해 전립선 건강과 심혈관 관리에 유의하세요. 흡연과 음주를 줄이고 유산소 운동을 통해 내장 지방을 관리하는 것이 중요합니다.</p>
                      )}
                    </div>
                  </div>

                  {/* Weight-based Guide */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <Activity className="w-5 h-5" />
                      체중 관리 조언
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 leading-relaxed">현재 체중 {userDetail.weight}kg을 기준으로 적절한 수분 섭취량은 약 {Math.round(userDetail.weight * 30 / 1000 * 10) / 10}L입니다.</p>
                      <p className="text-xs text-slate-500">※ 하루 수분 권장량 = 체중(kg) x 30ml</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-slate-800 text-white text-sm font-bold rounded-full shadow-2xl flex items-center gap-2 whitespace-nowrap"
          >
            <AlertCircle className="w-4 h-4 text-orange-400" />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Only on Home/History/Profile) */}
      {currentStep === 0 && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-md border-t border-slate-100 px-8 py-4 flex justify-between items-center z-50">
          <button onClick={() => {
            if (activeTab === 'home') setSessionVersion(v => v + 1);
            setActiveTab('home');
          }}>
            <NavItem icon={<Home className="w-6 h-6" />} active={activeTab === 'home'} />
          </button>
          <button onClick={() => {
            if (activeTab === 'history') setSessionVersion(v => v + 1);
            setActiveTab('history');
          }}>
            <NavItem icon={<ClipboardList className="w-6 h-6" />} active={activeTab === 'history'} />
          </button>
          <button onClick={() => {
            if (activeTab === 'profile') setSessionVersion(v => v + 1);
            setActiveTab('profile');
          }}>
            <NavItem icon={<User className="w-6 h-6" />} active={activeTab === 'profile'} />
          </button>
        </nav>
      )}
    </div>
  );
}

// Sub-components
function MenuCard({ icon, title, desc, onClick }: { icon: React.ReactNode, title: string, desc: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-start text-left space-y-2 hover:border-blue-200 transition-all group"
    >
      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        <p className="text-[10px] text-slate-400 leading-tight">{desc}</p>
      </div>
    </button>
  );
}

function StepHeader({ title, onBack }: { title: string, onBack: () => void }) {
  return (
    <div className="flex items-center gap-4">
      <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
        <ChevronLeft className="w-6 h-6" />
      </button>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
    </div>
  );
}

function SelectButton({ active, onClick, title, desc }: { active: boolean, onClick: () => void, title: string, desc: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-4 rounded-2xl border flex items-center gap-4 text-left transition-all",
        active ? "bg-blue-50 border-blue-600 ring-1 ring-blue-600 shadow-sm" : "bg-white border-slate-200"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
        active ? "border-blue-600" : "border-slate-300"
      )}>
        {active && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
      </div>
      <div>
        <h4 className={cn("text-sm font-bold", active ? "text-blue-600" : "text-slate-700")}>{title}</h4>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
    </button>
  );
}

function CheckTag({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) {
  return (
    <button 
      onClick={onChange}
      className={cn(
        "px-4 py-2 rounded-full text-xs font-medium border transition-all flex items-center gap-2",
        checked ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-500"
      )}
    >
      {label}
      {checked && <CheckCircle2 className="w-3 h-3" />}
    </button>
  );
}

function NavItem({ icon, active = false }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <div className={cn(
      "p-2 transition-colors",
      active ? "text-blue-600" : "text-slate-300 hover:text-slate-500"
    )}>
      {icon}
    </div>
  );
}
