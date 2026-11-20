import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  RefreshCw, 
  DollarSign, 
  Target, 
  Search, 
  X, 
  AlertCircle,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Home as HomeIcon,
  Plane,
  Lock,
  Edit3,
  Calendar,
  LogOut,
  Power,
  BookOpen,
  MessageCircle,
  HelpCircle,
  Settings,
  Volume2,
  VolumeX,
  ExternalLink,
  Globe,
  Music,
  Bell,
  Download,
  Trash2,
  ChevronDown,
  Hourglass
} from 'lucide-react';

import LineupBuilder from './LineupBuilder';
import { sounds } from './soundEffects';
import { translations } from './translations';

export interface SorareCard {
  id: string;
  name: string;
  position: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';
  rarity: 'SET' | 'LIMITED' | 'RARE' | 'SUPER_RARE' | 'UNIQUE' | 'COMMON';
  team: string;
  l10Average: number;
  l5Average: number;
  priceEur: number;
  xpBonus: number;
  isAvailable: boolean;
  hasUpcomingGame: boolean;
  upcomingGameDate?: string | null;
  opponent: string;
  isHome: boolean;
  isListedForSale?: boolean;
  isInOffer?: boolean;
  imageUrl?: string;
  slug?: string;
  serialNumber?: number;
  pictureUrl?: string;
  listingStatus?: 'ACTIVE' | 'EXPIRED' | 'NOT_LISTED';
  askingPrice?: number;
}

export type PilotTab = 'HOME' | 'SET' | 'MY_CLUB' | 'MISSIONS' | 'SCOUTING' | 'ARENA' | 'CALENDAR' | 'SELLING' | 'CRAFT' | 'LIVE' | 'ASSISTENZA' | 'SETTING';
export type MissionType = 'DECISIVE' | 'GOALS' | 'PASSES' | 'ATTACK_PASSES' | 'TACKLES';

interface DailyMission {
  id: string;
  title: string;
  type: MissionType;
  description: string;
  reward: string;
  requiredCount: number;
  selectedCards: (SorareCard | null)[];
  completed: boolean;
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
}

const CraftingCapsuleIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    style={{ filter: 'drop-shadow(0 0 10px #d000ff)' }}
  >
    <g transform="rotate(15 12 12)">
      <path d="M9.5 0.5H14.5V2H9.5V0.5Z" fill="#d000ff" />
      <path d="M5.5 2H18.5V5.5H5.5V2Z" fill="#16161a" stroke="#d000ff" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.5 5.5H17.5V19.5H6.5V5.5Z" fill="#d000ff" fillOpacity="0.3" stroke="#d000ff" strokeWidth="1.5" />
      <path d="M8 9C10 11 14 10 16 12" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      <path d="M8 13C11 12 13 15 16 14" stroke="#d000ff" strokeWidth="1" strokeLinecap="round" opacity="0.9" />
      <path d="M8 17C10 16 14 18 16 17" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <path d="M5.5 19.5H18.5V23H5.5V19.5Z" fill="#16161a" stroke="#d000ff" strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  </svg>
);

const NotificationBell: React.FC<{
  audioActive: boolean;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  currentLang?: 'IT' | 'EN' | 'FR' | 'ES';
}> = ({ audioActive, notifications, onClearNotifications, currentLang = 'IT' }) => {
  const t = (key: string) => translations[currentLang]?.[key] || key;
  const [isOpen, setIsOpen] = useState(false);
  const count = notifications.length;
  const hasNotifications = count > 0;

  useEffect(() => {
    if (!hasNotifications && isOpen) {
      setIsOpen(false);
    }
  }, [hasNotifications, isOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (audioActive) sounds.playClick();
          if (hasNotifications) setIsOpen(!isOpen);
        }}
        onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xl relative group bg-[#16161a] hover:bg-[#202028] border-2 border-zinc-700 hover:border-amber-500/50 cursor-pointer"
        title={hasNotifications ? `${count} ${t('notificationsToRead') || 'notifiche da leggere'}` : (t('notificationCenterTitle') || 'Centro Notifiche (Nessuna nuova notifica)')}
      >
        <Bell className="h-5 w-5 text-zinc-300 group-hover:text-amber-400 transition-transform group-hover:scale-110" />
        {hasNotifications && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-red-600 text-white text-[11px] font-black flex items-center justify-center border-2 border-[#0e0e12] shadow-[0_0_10px_rgba(220,38,38,0.9)]">
            {count}
          </span>
        )}
      </button>

      {isOpen && hasNotifications && (
        <div className="absolute right-0 mt-3 w-80 bg-[#16161a] border border-[#2a2a32] rounded-2xl p-4 shadow-2xl z-50 space-y-3">
          <div className="flex justify-between items-center border-b border-[#2a2a32] pb-2">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">{t('notificationCenterHeader') || 'Centro Notifiche'} ({count})</h4>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  if (audioActive) sounds.playClick();
                  onClearNotifications();
                  setIsOpen(false);
                }}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase cursor-pointer"
              >
                {t('markAsRead') || 'Segna lette'}
              </button>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)} 
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {notifications.map((notif) => (
              <div key={notif.id} className="bg-[#0e0e12] p-3 rounded-xl border border-[#282834]">
                <p className="text-xs font-bold text-white">{notif.title}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{notif.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const AssistenzaModule: React.FC<{ 
  audioActive: boolean;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  currentLang?: 'IT' | 'EN' | 'FR' | 'ES';
}> = ({ audioActive, notifications, onClearNotifications, currentLang = 'IT' }) => {
  const t = (key: string) => translations[currentLang]?.[key] || key;

  const supportLinks = [
    {
      title: "GRUPPO BOT AVATAR",
      url: "https://t.me/SorareAvatarBot",
      displayUrl: "t.me/SorareAvatarBot",
      icon: "🤖",
      bgBadge: "bg-sky-500/20 text-sky-400 border-sky-500/30"
    },
    {
      title: "TELEGRAM",
      url: "https://t.me/SorareAvatar",
      displayUrl: "t.me/SorareAvatar",
      icon: "✈️",
      bgBadge: "bg-blue-500/20 text-blue-400 border-blue-500/30"
    },
    {
      title: "X - TWITTER",
      url: "https://x.com/SorareAvatar",
      displayUrl: "x.com/SorareAvatar",
      icon: "✖️",
      bgBadge: "bg-zinc-700/40 text-zinc-200 border-zinc-600"
    },
    {
      title: "DISCORD",
      url: "https://discord.gg/Drnfmejc",
      displayUrl: "discord.gg/Drnfmejc",
      icon: "💬",
      bgBadge: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex justify-end items-center mb-2">
        <NotificationBell audioActive={audioActive} notifications={notifications} onClearNotifications={onClearNotifications} currentLang={currentLang} />
      </div>
      <div className="bg-[#16161a] border border-[#2a2a32] p-8 rounded-2xl flex items-center space-x-4 text-white shadow-md">
        <div className="w-14 h-14 rounded-2xl bg-[#16161a] border border-[#2a2a32] flex items-center justify-center shadow-xl shrink-0">
          <HelpCircle strokeWidth={2.8} className="h-7 w-7 text-indigo-400" style={{ filter: 'drop-shadow(0 0 14px rgba(99,102,241,0.8))' }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{t('support') || 'Assistenza & Link Utili'}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{t('supportSubtitle') || 'Contattami sulla piattaforma che preferisci per ricevere supporto.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {supportLinks.map((item, index) => (
          <a
            key={index}
            href={`https://${item.url.replace(/^https?:\/\//, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
            onClick={() => { if (audioActive) sounds.playClick(); }}
            className="bg-[#16161a] hover:bg-[#1f1f26] border border-[#2a2a32] hover:border-indigo-500/50 p-5 rounded-2xl flex items-center justify-between transition-all group shadow-md cursor-pointer"
          >
            <div className="flex items-center space-x-4 overflow-hidden">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 border ${item.bgBadge} shadow`}>
                {item.icon}
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-wider block">{item.title}</span>
                <span className="text-sm font-bold text-indigo-400 group-hover:text-indigo-300 truncate block transition-colors mt-0.5">
                  {item.displayUrl}
                </span>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-zinc-500 group-hover:text-white transition-colors shrink-0 ml-3" />
          </a>
        ))}
      </div>
    </div>
  );
};

export const CommunityModule: React.FC<{ 
  audioActive: boolean;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  currentLang?: 'IT' | 'EN' | 'FR' | 'ES';
}> = ({ audioActive, notifications, onClearNotifications, currentLang = 'IT' }) => {
  const t = (key: string) => translations[currentLang]?.[key] || key;

  const communityLinks = [
    {
      title: "GRUPPO BOT AVATAR",
      url: "https://t.me/SorareAvatarBot",
      displayUrl: "t.me/SorareAvatarBot",
      icon: "🤖",
      bgBadge: "bg-sky-500/20 text-sky-400 border-sky-500/30"
    },
    {
      title: "X - TWITTER",
      url: "https://x.com/SorareAvatar",
      displayUrl: "x.com/SorareAvatar",
      icon: "✖️",
      bgBadge: "bg-zinc-700/40 text-zinc-200 border-zinc-600"
    },
    {
      title: "CANALE DISCORD DOUBLET9095",
      url: "https://discord.gg/ZG2EsABDQ",
      displayUrl: "discord.gg/ZG2EsABDQ",
      icon: "💬",
      bgBadge: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
    },
    {
      title: "CANALE YOUTUBE",
      url: "https://www.youtube.com/@sorare.avatar",
      displayUrl: "youtube.com/@sorare.avatar",
      icon: "▶️",
      bgBadge: "bg-red-500/20 text-red-400 border-red-500/30"
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex justify-end items-center mb-2">
        <NotificationBell audioActive={audioActive} notifications={notifications} onClearNotifications={onClearNotifications} currentLang={currentLang} />
      </div>
      <div className="bg-[#16161a] border border-[#2a2a32] p-8 rounded-2xl flex items-center space-x-4 text-white shadow-md">
        <div className="w-14 h-14 rounded-2xl bg-[#16161a] border border-[#2a2a32] flex items-center justify-center shadow-xl shrink-0">
          <Users strokeWidth={2.8} className="h-7 w-7 text-indigo-400" style={{ filter: 'drop-shadow(0 0 14px rgba(99,102,241,0.8))' }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{t('community') || 'Community & Canali Ufficiali'}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{t('supportSubtitle') || 'Contattami sulla piattaforma che preferisci per ricevere supporto.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {communityLinks.map((item, index) => (
          <a
            key={index}
            href={`https://${item.url.replace(/^https?:\/\//, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
            onClick={() => { if (audioActive) sounds.playClick(); }}
            className="bg-[#16161a] hover:bg-[#1f1f26] border border-[#2a2a32] hover:border-indigo-500/50 p-5 rounded-2xl flex items-center justify-between transition-all group shadow-md cursor-pointer"
          >
            <div className="flex items-center space-x-4 overflow-hidden">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 border ${item.bgBadge} shadow`}>
                {item.icon}
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-wider block">{item.title}</span>
                <span className="text-sm font-bold text-indigo-400 group-hover:text-indigo-300 truncate block transition-colors mt-0.5">
                  {item.displayUrl}
                </span>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-zinc-500 group-hover:text-white transition-colors shrink-0 ml-3" />
          </a>
        ))}
      </div>
    </div>
  );
};

export const LiveModule: React.FC<{ 
  audioActive: boolean;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  currentLang?: 'IT' | 'EN' | 'FR' | 'ES';
}> = ({ audioActive, notifications, onClearNotifications, currentLang = 'IT' }) => {
  const t = (key: string) => translations[currentLang]?.[key] || key;

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex justify-end items-center mb-2">
        <NotificationBell audioActive={audioActive} notifications={notifications} onClearNotifications={onClearNotifications} currentLang={currentLang} />
      </div>
      <div className="bg-[#16161a] border border-[#2a2a32] p-16 rounded-2xl flex flex-col items-center justify-center text-center shadow-md space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shadow-[0_0_16px_rgba(239,68,68,0.4)]">
          <Hourglass className="w-8 h-8 text-red-400 animate-pulse" />
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-wider">{t('liveScoresTitle') || 'Live Punteggi'}</h3>
        <p className="text-sm font-bold text-red-400 uppercase tracking-widest bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20">
          {t('comingSoon') || 'Coming Soon'}
        </p>
      </div>
    </div>
  );
};

interface SettingModuleProps {
  audioActive: boolean;
  onToggleAudio: () => void;
  musicActive: boolean;
  onToggleMusic: () => void;
  cards: SorareCard[];
  accountName?: string;
  onLogout: () => void;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  currentLang: 'IT' | 'EN' | 'FR' | 'ES';
  onLanguageChange: (lang: 'IT' | 'EN' | 'FR' | 'ES') => void;
}

export const SettingModule: React.FC<SettingModuleProps> = ({ 
  audioActive, 
  onToggleAudio,
  musicActive,
  onToggleMusic,
  cards, 
  accountName, 
  onLogout, 
  notifications, 
  onClearNotifications,
  currentLang,
  onLanguageChange
}) => {
  const t = (key: string) => translations[currentLang]?.[key] || key;

  const [alertActive, setAlertActive] = useState<boolean>(() => localStorage.getItem('sorare_alerts') !== 'false');

  useEffect(() => {
    localStorage.setItem('sorare_alerts', String(alertActive));
  }, [alertActive]);

  const handleDownloadJsonData = () => {
    const exportData = {
      account: accountName || 'Ospite',
      exportDate: new Date().toISOString(),
      gdprNotice: t('gdprExportNotice') || "I diritti previsti dal GDPR includono l'accesso, la rettifica e la cancellazione dei dati personali.",
      cardsCount: cards.length,
      cardsGallery: cards
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sorarepilot_data_${accountName || 'user'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDeleteAccount = () => {
    const confirmation = window.confirm(
      t('deleteAccountConfirm') || "ATTENZIONE: Stai per eliminare il tuo account e tutti i dati salvati su SorarePilot in conformità con il GDPR. Questa azione è irreversibile. Vuoi procedere?"
    );
    if (confirmation) {
      localStorage.clear();
      alert(t('accountDeletedSuccess') || "Account e dati eliminati con successo.");
      onLogout();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex justify-end items-center mb-2">
        <NotificationBell audioActive={audioActive} notifications={notifications} onClearNotifications={onClearNotifications} currentLang={currentLang} />
      </div>
      <div className="bg-[#16161a] border border-[#2a2a32] p-8 rounded-2xl flex items-center space-x-4 text-white shadow-md">
        <div className="w-14 h-14 rounded-2xl bg-[#16161a] border border-[#2a2a32] flex items-center justify-center shadow-xl shrink-0">
          <Settings strokeWidth={2.8} className="h-7 w-7 text-amber-400" style={{ filter: 'drop-shadow(0 0 14px rgba(245,158,11,0.8))' }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{t('settings') || 'Impostazioni'}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{t('settingsSubtitle') || "Gestisci le preferenze dell'applicazione, l'audio, la lingua e i tuoi dati personali (GDPR)."}</p>
        </div>
      </div>

      <div className="bg-[#16161a] border border-[#2a2a32] p-6 rounded-2xl space-y-4 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{t('language') || 'Lingua'}</h3>
            <p className="text-xs text-zinc-400">{t('languageSubtitle') || "Scegli la lingua dell'interfaccia"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {[
            { code: 'EN', label: t('langEnglish') || 'Inglese' },
            { code: 'FR', label: t('langFrench') || 'Francese' },
            { code: 'ES', label: t('langSpanish') || 'Spagnolo' },
            { code: 'IT', label: t('langItalian') || 'Italiano' }
          ].map((lang) => (
            <button
              key={lang.code}
              type="button"
              onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
              onClick={() => {
                if (audioActive) sounds.playClick();
                onLanguageChange(lang.code as 'IT' | 'EN' | 'FR' | 'ES');
              }}
              className={`py-3 px-4 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                currentLang === lang.code
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-[#0e0e12] border-[#282834] text-zinc-400 hover:border-zinc-500 hover:text-white'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#16161a] border border-[#2a2a32] p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-md">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${audioActive ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
              {audioActive ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{t('audio') || 'Audio'}</h3>
              <p className="text-[11px] text-zinc-400">{t('audioSubtitle') || 'Effetti sonori UI'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#2a2a32]">
            <span className="text-xs font-bold text-zinc-300">{audioActive ? 'ON' : 'OFF'}</span>
            <button
              type="button"
              onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
              onClick={() => {
                if (audioActive) sounds.playClick();
                onToggleAudio();
              }}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${audioActive ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]' : 'bg-zinc-700'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${audioActive ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="bg-[#16161a] border border-[#2a2a32] p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-md">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${musicActive ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
              <Music className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{t('music') || 'Musica'}</h3>
              <p className="text-[11px] text-zinc-400">{t('musicSubtitle') || 'Musica di sottofondo'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#2a2a32]">
            <span className="text-xs font-bold text-zinc-300">{musicActive ? 'ON' : 'OFF'}</span>
            <button
              type="button"
              onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
              onClick={() => {
                if (audioActive) sounds.playClick();
                onToggleMusic();
              }}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${musicActive ? 'bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.6)]' : 'bg-zinc-700'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${musicActive ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <div className="bg-[#16161a] border border-[#2a2a32] p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-md">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${alertActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{t('alerts') || 'Alert'}</h3>
              <p className="text-[11px] text-zinc-400">{t('alertsSubtitle') || 'Notifiche di sistema'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#2a2a32]">
            <span className="text-xs font-bold text-zinc-300">{alertActive ? 'ON' : 'OFF'}</span>
            <button
              type="button"
              onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
              onClick={() => {
                if (audioActive) sounds.playClick();
                setAlertActive(!alertActive);
              }}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${alertActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-zinc-700'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${alertActive ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#16161a] border border-[#2a2a32] p-6 rounded-2xl space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('gdprData') || 'I tuoi dati (GDPR)'}</h3>
              <p className="text-xs text-zinc-400">{t('gdprSubtitle') || 'I diritti previsti dal GDPR (Accesso, Portabilità e Cancellazione)'}</p>
            </div>
          </div>

          <button
            type="button"
            onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
            onClick={() => {
              if (audioActive) sounds.playClick();
              handleDownloadJsonData();
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-5 py-2.5 rounded-xl flex items-center space-x-2 text-xs uppercase tracking-wider transition-all shadow cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>{t('downloadJson') || 'Scarica i tuoi dati (JSON)'}</span>
          </button>
        </div>
        <p className="text-xs text-zinc-400 bg-[#0e0e12] p-3.5 rounded-xl border border-[#282834]">
          {t('gdprDescription') || 'Il file JSON scaricabile contiene tutte le informazioni salvate su di te da SorarePilot, inclusa la tua galleria di carte sincronizzate ed eventuali preferenze memorizzate localmente.'}
        </p>
      </div>

      <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-red-400">{t('deleteAccount') || 'Elimina Account'}</h3>
            <p className="text-xs text-zinc-400">{t('deleteAccountSubtitle') || 'Cancella permanentemente tutti i dati e le sessioni attive'}</p>
          </div>
        </div>

        <button
          type="button"
          onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
          onClick={() => {
            if (audioActive) sounds.playClick();
            handleDeleteAccount();
          }}
          className="bg-red-600 hover:bg-red-500 text-white font-black px-5 py-2.5 rounded-xl flex items-center space-x-2 text-xs uppercase tracking-wider transition-all shadow cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          <span>{t('deleteAccountButton') || 'Elimina Account'}</span>
        </button>
      </div>
    </div>
  );
};

export const HomeModule: React.FC<{ 
  setActiveTab: (tab: PilotTab) => void; 
  onOpenSync: () => void;
  onManualSync: () => void;
  onLogout: () => void;
  accountName?: string;
  accountAvatarUrl?: string;
  user?: any;
  currentUser?: any;
  isSyncing?: boolean;
  audioActive: boolean;
  onToggleAudio: () => void;
  musicActive: boolean;
  onToggleMusic: () => void;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  currentLang?: 'IT' | 'EN' | 'FR' | 'ES';
  setCurrentLang?: (lang: 'IT' | 'EN' | 'FR' | 'ES') => void;
}> = ({ 
  setActiveTab, 
  onManualSync, 
  onLogout, 
  accountName, 
  accountAvatarUrl, 
  user, 
  currentUser, 
  isSyncing, 
  audioActive, 
  onToggleAudio, 
  musicActive,
  onToggleMusic,
  notifications, 
  onClearNotifications,
  currentLang = 'IT',
  setCurrentLang
}) => {
  const t = (key: string) => translations[currentLang]?.[key] || key;

  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [isCircleHovered, setIsCircleHovered] = useState(false);
  const [isTitleHovered, setIsTitleHovered] = useState(false);

  const circleRef = React.useRef<HTMLDivElement | null>(null);
  const titleImgRef = React.useRef<HTMLImageElement | null>(null);
  const prevSyncingRef = React.useRef(isSyncing);

  const isLogoHovered = isCircleHovered || isTitleHovered;
  const prevLogoHoveredRef = React.useRef(false);

  useEffect(() => {
    if (isLogoHovered && !prevLogoHoveredRef.current && audioActive) {
      sounds.playHover();
    }
    prevLogoHoveredRef.current = isLogoHovered;
  }, [isLogoHovered, audioActive]);

  // Gestione sicura della lingua attiva
  const activeLang = currentLang || (localStorage.getItem('sorare_lang') as any) || 'IT';

  const handleLangChange = (lang: 'IT' | 'EN' | 'FR' | 'ES') => {
    localStorage.setItem('sorare_lang', lang);
    if (setCurrentLang) {
      setCurrentLang(lang);
    }
    setLangMenuOpen(false);
  };

  useEffect(() => {
    if (prevSyncingRef.current && !isSyncing) {
      setShowSyncSuccess(true);
      const timer = setTimeout(() => {
        setShowSyncSuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
    prevSyncingRef.current = isSyncing;
  }, [isSyncing]);

  const handleSyncClick = () => {
    if (isSyncing) return;
    if (audioActive) sounds.playClick();
    onManualSync();
  };

  const handleAudioToggle = () => {
    const nextState = !audioActive;
    onToggleAudio();
    if (nextState && typeof sounds !== 'undefined') {
      setTimeout(() => sounds.playClick(), 50);
    }
  };

  const handleMusicToggle = () => {
    const nextState = !musicActive;
    onToggleMusic();
    if (nextState && audioActive && typeof sounds !== 'undefined') {
      setTimeout(() => sounds.playClick(), 50);
    }
  };

  const updateCircleHoverFromPoint = (clientX: number, clientY: number) => {
    const el = circleRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scaleFactor = isLogoHovered ? 1.05 : 1;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const baseDiameter = Math.min(rect.width, rect.height) / scaleFactor;
    const radius = Math.max(0, baseDiameter / 2 - 2);
    const dx = clientX - cx;
    const dy = clientY - cy;
    const inside = dx * dx + dy * dy <= radius * radius;
    setIsCircleHovered((prev) => (prev === inside ? prev : inside));
  };

  const updateTitleHoverFromPoint = (clientX: number, clientY: number) => {
    const el = titleImgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setIsTitleHovered(false);
      return;
    }
    const scaleFactor = isLogoHovered ? 1.05 : 1;
    const baseW = rect.width / scaleFactor;
    const baseH = rect.height / scaleFactor;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const inside =
      Math.abs(clientX - cx) <= baseW / 2 &&
      Math.abs(clientY - cy) <= baseH / 2;
    setIsTitleHovered((prev) => (prev === inside ? prev : inside));
  };

  // Recupero esatto della foto profilo ufficiale Sorare dall'utente loggato
  const sorareAvatar = 
    accountAvatarUrl || 
    user?.pictureUrl || 
    currentUser?.pictureUrl || 
    user?.avatarUrl || 
    currentUser?.avatarUrl || 
    user?.profile?.pictureUrl || 
    currentUser?.profile?.pictureUrl;

  return (
    <div
      onMouseMove={(e) => {
        updateCircleHoverFromPoint(e.clientX, e.clientY);
        updateTitleHoverFromPoint(e.clientX, e.clientY);
      }}
      onMouseLeave={() => {
        setIsCircleHovered(false);
        setIsTitleHovered(false);
      }}
      className="flex flex-col items-center justify-center min-h-[88vh] relative px-4 pt-4 pb-4 select-none overflow-hidden w-full"
    >
      
     {/* CONTENITORE PRINCIPALE IN ALTO A SINISTRA */}
<div className="absolute top-1 left-[1cm] z-30 flex items-center space-x-6 select-none translate-y-[2mm]">
  
  {/* Slogan inclinato */}
  <div className="transform -rotate-4">
    <h1 className="text-2xl sm:text-2xl font-black uppercase tracking-tighter italic text-white leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
      <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]">
        {t('sloganTop') || 'PREPARATI AL'}
      </span>
      <br />
      <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-400 bg-clip-text text-transparent text-xl sm:text-2xl tracking-normal drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]">
        {t('sloganBottom') || 'DECOLLO SU'}
      </span>
    </h1>
  </div>
  {/* Logo Sorare dritto e cliccabile di fianco */}
  <a
    href="https://sorare.com"
    target="_blank"
    rel="noopener noreferrer"
    className="transition-transform duration-300 hover:scale-110 cursor-pointer drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] shrink-0"
    title={t('goToSorare') || 'Vai al sito ufficiale di Sorare'}
  >
    <img 
      src="/sorare-logo.png" 
      alt="Sorare Official Logo" 
      className="w-12 h-12 sm:w-54 sm:h-24 object-contain"
    />
  </a>

</div>

{/* ---> PULSANTE MY CLUB AGGIORNATO <--- */}
      <div className="absolute left-7 top-4/15 -translate-y-1/2 z-30">
        <button
          type="button"
          onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
          onClick={() => {
            if (audioActive) sounds.playClick();
            setActiveTab('MY_CLUB');
          }}
          className="px-6 py-4 rounded-2xl bg-amber-600 hover:bg-amber-300 text-slate-150 font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(251,191,36,0.5)] border-2 border-amber-300 hover:scale-105 cursor-pointer flex items-center space-x-2.5"
          title={t('goToMyClub') || 'Vai al tuo club'}
        >
          <ShieldCheck className="h-8 w-5" />
          <span>{t('myClub') || 'MY CLUB'}</span>
        </button>
      </div>

      {/* 1. BLOCCO SUPERIORE ESTREMO IN ALTO A DESTRA */}
      <div className="absolute top-0 right-0 flex items-center space-x-2.5 z-30">
        
        {/* Pulsante LIVE Rosso */}
        <button
          type="button"
          onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
          onClick={() => {
            if (audioActive) sounds.playClick();
            setActiveTab('LIVE');
          }}
          className="px-4 h-12 rounded-2xl flex items-center space-x-2 bg-red-600/90 hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(239,68,68,0.5)] border-2 border-red-500 hover:border-red-400 cursor-pointer relative group"
          title={t('liveScoresTitle') || 'Segui i punteggi in diretta'}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white shrink-0"></span>
          <span className="tracking-widest">{t('live') || 'LIVE'}</span>
        </button>

        {/* Tasto Sincronizza a icona */}
        {accountName && (
          <button
            type="button"
            onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xl relative group bg-[#16161a] hover:bg-[#202028] border-2 border-zinc-700 hover:border-indigo-500 cursor-pointer disabled:opacity-55"
            title={t('syncAccount') || 'Sincronizza account'}
          >
            <RefreshCw className={`h-5 w-5 text-indigo-400 transition-transform ${isSyncing ? 'animate-spin' : 'group-hover:scale-110'}`} />
          </button>
        )}

        <NotificationBell 
          audioActive={audioActive} 
          notifications={notifications} 
          onClearNotifications={onClearNotifications} 
          currentLang={currentLang}
        />

        {accountName && (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (audioActive) sounds.playClick();
                setUserMenuOpen(!userMenuOpen);
              }}
              onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
              className="flex items-center space-x-2.5 bg-[#16161a] hover:bg-[#202028] border-2 border-[#2a2a32] hover:border-zinc-600 px-3 py-1.5 rounded-2xl shadow-xl cursor-pointer transition-all h-12"
            >
              {/* Avatar ufficiale di Sorare identico al sito */}
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 border border-indigo-400/40 flex items-center justify-center overflow-hidden shadow shrink-0">
                {sorareAvatar ? (
                  <img 
                    src={sorareAvatar} 
                    alt={accountName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src="https://images.sorare.com/users/default.png" 
                    alt="Sorare Default" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-white tracking-wide leading-tight">{accountName}</p>
                <p className="text-[10px] font-bold text-emerald-400 leading-tight">{t('connected') || 'Connesso'}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Menu a tendina utente */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#16161a] border border-[#2a2a32] rounded-2xl p-2 shadow-2xl z-50 space-y-1">
                <div className="px-3 py-2 border-b border-[#282834]">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">{t('sorareAccount') || 'Account Sorare'}</p>
                  <p className="text-xs font-black text-white truncate">{accountName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    if (audioActive) sounds.playClick();
                    onLogout();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('disconnect') || 'Disconnetti'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FEEDBACK VISIVO "VISTO VERDE" A FINE SINCRONIZZAZIONE (2 SECONDI) */}
      {showSyncSuccess && (
        <div className="absolute top-16 right-2 bg-emerald-950/90 border border-emerald-500/60 px-5 py-2.5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center space-x-2.5 z-50 animate-bounce">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span className="text-xs font-black text-emerald-200 tracking-wide">{t('syncComplete') || 'Sincronizzazione completata'}</span>
        </div>
      )}

      {/* 2. SELETTORE LINGUA, PULSANTE AUDIO E PULSANTE MUSICA IN BASSO A SINISTRA */}
      <div className="absolute bottom-0 left-0 z-30 flex items-center space-x-2">
        {/* SELETTORE LINGUA CON BANDIERE VETTORIALI */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (audioActive) sounds.playClick();
              setLangMenuOpen(!langMenuOpen);
            }}
            onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
            className="h-12 px-3 rounded-2xl bg-[#16161a] hover:bg-[#202028] border-2 border-zinc-700 hover:border-indigo-500 flex items-center space-x-2 text-white font-bold text-sm shadow-xl cursor-pointer transition-all"
            title={t('changeLanguage') || 'Cambia Lingua'}
          >
            <img 
              src={`https://flagcdn.com/w40/${activeLang === 'EN' ? 'gb' : activeLang.toLowerCase()}.png`} 
              alt={activeLang} 
              className="w-6 h-4 object-cover rounded shadow-sm" 
            />
            <span className="text-xs uppercase font-black">{activeLang}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {langMenuOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-40 bg-[#16161a] border border-[#2a2a32] rounded-2xl p-1.5 shadow-2xl z-50 space-y-1">
              <button
                type="button"
                onClick={() => { handleLangChange('IT'); if(audioActive) sounds.playClick(); }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeLang === 'IT' ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-[#202028]'}`}
              >
                <img src="https://flagcdn.com/w40/it.png" alt="IT" className="w-5 h-3.5 object-cover rounded shadow-sm" />
                <span>Italiano</span>
              </button>
              <button
                type="button"
                onClick={() => { handleLangChange('EN'); if(audioActive) sounds.playClick(); }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeLang === 'EN' ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-[#202028]'}`}
              >
                <img src="https://flagcdn.com/w40/gb.png" alt="EN" className="w-5 h-3.5 object-cover rounded shadow-sm" />
                <span>English</span>
              </button>
              <button
                type="button"
                onClick={() => { handleLangChange('FR'); if(audioActive) sounds.playClick(); }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeLang === 'FR' ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-[#202028]'}`}
              >
                <img src="https://flagcdn.com/w40/fr.png" alt="FR" className="w-5 h-3.5 object-cover rounded shadow-sm" />
                <span>Français</span>
              </button>
              <button
                type="button"
                onClick={() => { handleLangChange('ES'); if(audioActive) sounds.playClick(); }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeLang === 'ES' ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-[#202028]'}`}
              >
                <img src="https://flagcdn.com/w40/es.png" alt="ES" className="w-5 h-3.5 object-cover rounded shadow-sm" />
                <span>Español</span>
              </button>
            </div>
          )}
        </div>

        {/* PULSANTE AUDIO */}
        <button
          type="button"
          onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
          onClick={handleAudioToggle}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xl cursor-pointer border-2 ${
            audioActive 
              ? 'bg-[#16161a] hover:bg-[#202028] border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
              : 'bg-[#16161a] hover:bg-[#202028] border-zinc-800 text-zinc-500 hover:text-zinc-300'
          }`}
          title={audioActive ? (t('disableAudio') || 'Disattiva Audio') : (t('enableAudio') || 'Attiva Audio')}
        >
          {audioActive ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>

        {/* PULSANTE MUSICA A FIANCO DELL'AUDIO */}
        <button
          type="button"
          onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
          onClick={handleMusicToggle}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xl cursor-pointer border-2 ${
            musicActive 
              ? 'bg-[#16161a] hover:bg-[#202028] border-purple-500/60 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
              : 'bg-[#16161a] hover:bg-[#202028] border-zinc-800 text-zinc-500 hover:text-zinc-300'
          }`}
          title={musicActive ? (t('disableMusic') || 'Disattiva Musica') : (t('enableMusic') || 'Attiva Musica')}
        >
          <Music className="h-5 w-5" />
        </button>
      </div>

      {/* 3. LOGO CENTRALE E TITLE UNIFICATI COME UN UNICO LINK AL CANALE YOUTUBE */}
      <div className="relative flex flex-col items-center justify-center my-auto translate-y-32 sm:translate-y-40 pointer-events-none">
        <div className="flex flex-col items-center pointer-events-none">
          <div
            ref={circleRef}
            style={{
              transform: isLogoHovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 300ms ease',
              cursor: isLogoHovered ? 'pointer' : 'default',
            }}
            className="w-72 h-72 sm:w-[380px] sm:h-[380px] rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-[#0a0a0c] border-[7px] border-zinc-200 pointer-events-auto"
          >
            <a
              href="https://www.youtube.com/@sorare.avatar"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!isLogoHovered) {
                  e.preventDefault();
                  return;
                }
                if (audioActive) sounds.playClick();
              }}
              className="w-full h-full flex items-center justify-center"
              title={t('visitYoutube') || 'Visita il canale YouTube'}
            >
              <img 
                src="/logo.png" 
                alt="SorarePilot Logo" 
                className="w-full h-full object-cover scale-105 pointer-events-none"
                style={{ filter: 'drop-shadow(0 0 18px rgba(91, 94, 226, 0.65))' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </a>
          </div>
          
          <div className="relative z-10 -mt-45 sm:-mt-63 flex justify-center px-3 py-1 pointer-events-none">
            <a
              href="https://www.youtube.com/@sorare.avatar"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!isLogoHovered) {
                  e.preventDefault();
                  return;
                }
                if (audioActive) sounds.playClick();
              }}
              style={{
                transform: isLogoHovered ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 300ms ease',
                filter: 'drop-shadow(0 0 22px rgba(99, 102, 241, 0.8)) brightness(1.05)',
                cursor: isLogoHovered ? 'pointer' : 'default',
              }}
              className="relative inline-flex justify-center pointer-events-auto"
              title={t('visitYoutube') || 'Visita il canale YouTube'}
            >
              <img 
                ref={titleImgRef}
                src="/title.png" 
                alt="SorarePilot Title" 
                className="max-w-[650px] sm:max-w-[850px] object-contain h-auto relative z-10 pointer-events-none"
                style={{ imageRendering: 'high-quality', filter: 'brightness(1.3) contrast(1.1)' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </a>
          </div>
        </div>
        
        <button
          type="button"
          onMouseEnter={() => { if (audioActive && accountName) sounds.playHover(); }}
          onClick={() => {
            if (!accountName) return;
            if (audioActive) sounds.playClick();
            setActiveTab('MISSIONS');
          }}
          style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
          className={`absolute -top-30 sm:-top-38 group flex flex-col items-center transition-all z-20 pointer-events-auto ${accountName ? 'hover:scale-110' : 'opacity-40'}`}
        >
          <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-[#16161a] border border-[#2a2a32] flex items-center justify-center shadow-2xl group-hover:border-[#00bfff]">
            <Target strokeWidth={2.8} className="h-7 w-7 sm:h-9 sm:w-9 text-[#00bfff]" style={{ filter: 'drop-shadow(0 0 14px #00bfff)' }} />
          </div>
          <span className="text-[11px] font-black text-white mt-1 uppercase tracking-wider bg-black/80 px-2 py-0.5 rounded-md border border-white/10 shadow">
            {accountName ? (t('missions') || 'Missioni') : (t('locked') || 'Bloccato')}
          </span>
        </button>

        <button
          type="button"
          onMouseEnter={() => { if (audioActive && accountName) sounds.playHover(); }}
          onClick={() => {
            if (!accountName) return;
            if (audioActive) sounds.playClick();
            setActiveTab('SCOUTING');
          }}
          style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
          className={`absolute -top-2 -left-12 sm:-top-10 sm:left-[120px] group flex flex-col items-center transition-all z-20 pointer-events-auto ${accountName ? 'hover:scale-110' : 'opacity-40'}`}
        >
          <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-[#16161a] border border-[#2a2a32] flex items-center justify-center shadow-2xl group-hover:border-[#00ff66]">
            <Search strokeWidth={2.8} className="h-7 w-7 sm:h-9 sm:w-9 text-[#00ff66]" style={{ filter: 'drop-shadow(0 0 14px #00ff66)' }} />
          </div>
          <span className="text-[11px] font-black text-white mt-1 uppercase tracking-wider bg-black/80 px-2 py-0.5 rounded-md border border-white/10 shadow">
            {accountName ? (t('scouting') || 'Scouting') : (t('locked') || 'Bloccato')}
          </span>
        </button>

        <button
          type="button"
          onMouseEnter={() => { if (audioActive && accountName) sounds.playHover(); }}
          onClick={() => {
            if (!accountName) return;
            if (audioActive) sounds.playClick();
            setActiveTab('ARENA');
          }}
          style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
          className={`absolute -top-2 -right-12 sm:-top-10 sm:right-[120px] group flex flex-col items-center transition-all z-20 pointer-events-auto ${accountName ? 'hover:scale-110' : 'opacity-40'}`}
        >
          <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-[#16161a] border border-[#2a2a32] flex items-center justify-center shadow-2xl group-hover:border-[#ffea00]">
            <Users strokeWidth={2.8} className="h-7 w-7 sm:h-9 sm:w-9 text-[#ffea00]" style={{ filter: 'drop-shadow(0 0 14px #ffea00)' }} />
          </div>
          <span className="text-[11px] font-black text-white mt-1 uppercase tracking-wider bg-black/80 px-2 py-0.5 rounded-md border border-white/10 shadow">
            {accountName ? (t('lineups') || 'Formazioni') : (t('locked') || 'Bloccato')}
          </span>
        </button>

        <button
          type="button"
          onMouseEnter={() => { if (audioActive && accountName) sounds.playHover(); }}
          onClick={() => {
            if (!accountName) return;
            if (audioActive) sounds.playClick();
            setActiveTab('SELLING');
          }}
          style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
          className={`absolute top-52 -left-20 sm:top-56 sm:left-[64px] group flex flex-col items-center transition-all z-20 pointer-events-auto ${accountName ? 'hover:scale-110' : 'opacity-40'}`}
        >
          <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-[#16161a] border border-[#2a2a32] flex items-center justify-center shadow-2xl group-hover:border-[#ff003c]">
            <DollarSign strokeWidth={2.8} className="h-7 w-7 sm:h-9 sm:w-9 text-[#ff003c]" style={{ filter: 'drop-shadow(0 0 14px #ff003c)' }} />
          </div>
          <span className="text-[11px] font-black text-white mt-1 uppercase tracking-wider bg-black/80 px-2 py-0.5 rounded-md border border-white/10 shadow">
            {accountName ? (t('selling') || 'Vendite') : (t('locked') || 'Bloccato')}
          </span>
        </button>

        <button
          type="button"
          onMouseEnter={() => { if (audioActive && accountName) sounds.playHover(); }}
          onClick={() => {
            if (!accountName) return;
            if (audioActive) sounds.playClick();
            setActiveTab('CRAFT');
          }}
          style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
          className={`absolute top-52 -right-20 sm:top-56 sm:right-[64px] group flex flex-col items-center transition-all z-20 pointer-events-auto ${accountName ? 'hover:scale-110' : 'opacity-40'}`}
        >
          <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-[#16161a] border border-[#2a2a32] flex items-center justify-center shadow-2xl group-hover:border-[#d000ff]">
            <CraftingCapsuleIcon className="h-7 w-7 sm:h-9 sm:w-9" />
          </div>
          <span className="text-[11px] font-black text-white mt-1 uppercase tracking-wider bg-black/80 px-2 py-0.5 rounded-md border border-white/10 shadow">
            {accountName ? (t('crafting') || 'Crafting') : (t('locked') || 'Bloccato')}
          </span>
        </button>
      </div>
    </div>
  );
};

interface SidebarProps {
  activeTab: PilotTab;
  setActiveTab: (tab: PilotTab) => void;
  accountName?: string;
  onLogout: () => void;
  audioActive: boolean;
  onToggleAudio: () => void;
  currentLang?: 'IT' | 'EN' | 'FR' | 'ES';
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, accountName, audioActive, currentLang = 'IT' }) => {
  const t = (key: string) => translations[currentLang]?.[key] || key;

  const getItemStyle = (tab: PilotTab) => {
    return activeTab === tab
      ? 'bg-[#1e1e24] text-white font-black text-base shadow-sm'
      : 'text-[#9a9aa8] hover:bg-[#15151a] hover:text-white font-bold text-base';
  };

  const handleRestrictedTab = (tab: PilotTab) => {
    if (!accountName) return; 
    setActiveTab(tab);
  };

  // Sezioni in cui deve comparire SOLAMENTE il tasto Home (SET, Community, Assistenza e Impostazioni)
  const isUtilitySection = (['SET', 'COMMUNITY', 'ASSISTENZA', 'SETTING'] as PilotTab[]).includes(activeTab);
  
  // Sezioni in cui compaiono tutti i menu PRO completi
  const isProSection = ['MISSIONS', 'SCOUTING', 'ARENA', 'SELLING', 'CRAFT', 'MY_CLUB', 'LIVE'].includes(activeTab);

  // In Home nessuno dei due è selezionato. Nelle altre pagine si accende quello giusto.
  const isSetSelected = activeTab === 'SET';
  const isProSelected = isProSection; // Acceso solo nelle sezioni PRO (spento in HOME)

  return (
    <aside className="w-68 bg-[#0a0a0c] border-r border-[#222228] flex flex-col justify-between shrink-0 h-screen sticky top-0 p-4 select-none z-30 overflow-y-auto custom-scrollbar">
      <div className="space-y-1.5">
        {/* LOGO E TASTI SET/PRO ATTACCATI IN ALTO */}
        <div className="space-y-1 px-1 pt-0">
          <div className="flex flex-col items-center text-center space-y-0 pb-1">
            <div 
              onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
              onClick={() => {
                if (audioActive) sounds.playClick();
                setActiveTab('HOME');
              }}
              className="flex flex-col items-center cursor-pointer p-1 rounded-2xl transition-all hover:scale-105"
            >
              {/* Cerchio con bordo bianco/argento e glow identico alla Home */}
              <div 
                className="w-24 h-24 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-[#0a0a0c] border-[3px] border-zinc-200"
                style={{ filter: 'drop-shadow(0 0 18px rgba(99, 102, 241, 0.65)) brightness(1.1) contrast(1.05)' }}
              >
                <img 
                  src="/logo.png" 
                  alt="SorarePilot Logo" 
                  className="w-full h-full object-cover scale-105" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
              </div>

              {/* Scritta SorarePilot allargata e sovrapposta al bordo inferiore */}
              <div 
                className="relative z-10 -mt-16 w-full flex justify-center" 
                style={{ filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 14px rgba(99, 102, 241, 0.65))' }}
              >
                <img 
                  src="/title.png" 
                  alt="SorarePilot Title" 
                  className="w-[215px] max-w-none object-contain h-auto relative z-10" 
                  style={{ imageRendering: 'high-quality', filter: 'brightness(1.5) contrast(1.1)' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
              </div>
            </div>
          </div>

          {/* TASTI SET E PRO NEUTRI IN HOME, CLICCABILI ENTRAMBI */}
          <div className="bg-[#121216] p-1.5 rounded-xl border border-[#222228] flex items-center justify-between text-sm font-bold text-zinc-400 mt-2">
            <button 
              type="button" 
              onMouseEnter={() => { if (audioActive && accountName && !isSetSelected) sounds.playHover(); }}
              onClick={() => {
                if (!accountName || isSetSelected) return;
                if (audioActive) sounds.playClick();
                handleRestrictedTab('SET');
              }}
              style={{ cursor: !accountName ? 'not-allowed' : isSetSelected ? 'default' : 'pointer' }}
              className={`w-1/2 py-1.5 rounded-lg text-center font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
                !accountName ? 'opacity-40' : ''
              } ${isSetSelected ? 'bg-[#1c1c24] text-white shadow opacity-100' : 'hover:text-white opacity-70'}`}
            >
              <span className="text-[8px] bg-white text-black px-1.5 py-0.5 rounded font-black leading-tight">SET</span>
              <span>SET</span>
            </button>
            <button 
              type="button" 
              onMouseEnter={() => { if (audioActive && accountName && !isProSelected) sounds.playHover(); }}
              onClick={() => {
                if (!accountName || isProSelected) return;
                if (audioActive) sounds.playClick();
                setActiveTab('MISSIONS');
              }}
              style={{ cursor: !accountName ? 'not-allowed' : isProSelected ? 'default' : 'pointer' }}
              className={`w-1/2 py-1.5 rounded-lg text-center font-extrabold shadow flex items-center justify-center space-x-1.5 transition-all ${
                !accountName ? 'opacity-40' : ''
              } ${isProSelected ? 'bg-[#1c1c24] text-white opacity-100' : 'hover:text-white opacity-70 bg-transparent shadow-none'}`}
            >
              <span className="text-[8px] bg-white text-black px-1.5 py-0.5 rounded font-black leading-tight">PRO</span>
              <span>PRO</span>
            </button>
          </div>
        </div>

        {/* SE SIAMO IN SET, COMMUNITY, ASSISTENZA O IMPOSTAZIONI: MOSTRA SOLO IL TASTO HOME */}
        {isUtilitySection && (
          <nav className="space-y-1.5 pt-1">
            <button
              type="button"
              onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
              onClick={() => {
                if (audioActive) sounds.playClick();
                setActiveTab('HOME');
              }}
              className={`w-full px-4 py-3 rounded-xl flex items-center space-x-3.5 transition-all group cursor-pointer ${getItemStyle('HOME')}`}
            >
              <HomeIcon strokeWidth={2.8} className="h-5 w-5 shrink-0 text-white transition-all group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 12px #ffffff)' }} />
              <span>{t('home') || 'Home'}</span>
            </button>
          </nav>
        )}

        {/* SE SIAMO IN UNA SEZIONE PRO: MOSTRA TUTTI I MENU */}
        {isProSection && (
          <nav className="space-y-1.5 pt-1">
            <button
              type="button"
              onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
              onClick={() => {
                if (audioActive) sounds.playClick();
                setActiveTab('HOME');
              }}
              className={`w-full px-4 py-3 rounded-xl flex items-center space-x-3.5 transition-all group cursor-pointer ${getItemStyle('HOME')}`}
            >
              <HomeIcon strokeWidth={2.8} className="h-5 w-5 shrink-0 text-white transition-all group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 12px #ffffff)' }} />
              <span>{t('home') || 'Home'}</span>
            </button>

            <button
              type="button"
              onMouseEnter={() => { if (audioActive && accountName) sounds.playHover(); }}
              onClick={() => {
                if (!accountName) return;
                if (audioActive) sounds.playClick();
                handleRestrictedTab('MISSIONS');
              }}
              style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
              className={`w-full px-4 py-3 rounded-xl flex items-center space-x-3.5 transition-all group ${
                !accountName ? 'opacity-40' : ''
              } ${getItemStyle('MISSIONS')}`}
            >
              <Target strokeWidth={2.8} className="h-5 w-5 shrink-0 text-[#00bfff] transition-all group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 14px #00bfff)' }} />
              <span>{t('missions') || 'Missions'}</span>
              {!accountName && <Lock className="h-4 w-4 ml-auto text-zinc-500" />}
            </button>

            <button
              type="button"
              onMouseEnter={() => { if (audioActive && accountName) sounds.playHover(); }}
              onClick={() => {
                if (!accountName) return;
                if (audioActive) sounds.playClick();
                handleRestrictedTab('SCOUTING');
              }}
              style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
              className={`w-full px-4 py-3 rounded-xl flex items-center space-x-3.5 transition-all group ${
                !accountName ? 'opacity-40' : ''
              } ${getItemStyle('SCOUTING')}`}
            >
              <Search strokeWidth={2.8} className="h-5 w-5 shrink-0 text-[#00ff66] transition-all group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 14px #00ff66)' }} />
              <span>{t('scouting') || 'Scouting'}</span>
              {!accountName && <Lock className="h-4 w-4 ml-auto text-zinc-500" />}
            </button>

            <button
              type="button"
              onMouseEnter={() => { if (audioActive && accountName) sounds.playHover(); }}
              onClick={() => {
                if (!accountName) return;
                if (audioActive) sounds.playClick();
                handleRestrictedTab('ARENA');
              }}
              style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
              className={`w-full px-4 py-3 rounded-xl flex items-center space-x-3.5 transition-all group ${
                !accountName ? 'opacity-40' : ''
              } ${getItemStyle('ARENA')}`}
            >
              <Users strokeWidth={2.8} className="h-5 w-5 shrink-0 text-[#ffea00] transition-all group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 14px #ffea00)' }} />
              <span>{t('lineups') || 'Lineups'}</span>
              {!accountName && <Lock className="h-4 w-4 ml-auto text-zinc-500" />}
            </button>

            <button
              type="button"
              onMouseEnter={() => { if (audioActive && accountName) sounds.playHover(); }}
              onClick={() => {
                if (!accountName) return;
                if (audioActive) sounds.playClick();
                handleRestrictedTab('SELLING');
              }}
              style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
              className={`w-full px-4 py-3 rounded-xl flex items-center space-x-3.5 transition-all group ${
                !accountName ? 'opacity-40' : ''
              } ${getItemStyle('SELLING')}`}
            >
              <DollarSign strokeWidth={2.8} className="h-5 w-5 shrink-0 text-[#ff003c] transition-all group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 14px #ff003c)' }} />
              <span>{t('selling') || 'Selling'}</span>
              {!accountName && <Lock className="h-4 w-4 ml-auto text-zinc-500" />}
            </button>

            <button
              type="button"
              onMouseEnter={() => { if (audioActive && accountName) sounds.playHover(); }}
              onClick={() => {
                if (!accountName) return;
                if (audioActive) sounds.playClick();
                handleRestrictedTab('CRAFT');
              }}
              style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
              className={`w-full px-4 py-3 rounded-xl flex items-center space-x-3.5 transition-all group ${
                !accountName ? 'opacity-40' : ''
              } ${getItemStyle('CRAFT')}`}
            >
              <CraftingCapsuleIcon className="h-5 w-5 shrink-0" />
              <span>{t('crafting') || 'Crafting'}</span>
              {!accountName && <Lock className="h-4 w-4 ml-auto text-zinc-500" />}
            </button>
          </nav>
        )}

        {/* 4 TASTI DELLA HOME (VISIBILI SOLO IN HOME) */}
        {activeTab === 'HOME' && (
          <nav className="space-y-1.5 pt-1">
            <button
              type="button"
              onMouseEnter={() => { if (accountName && audioActive) sounds.playHover(); }}
              onClick={() => {
                if (!accountName) return;
                if (audioActive) sounds.playClick();
                alert(t('guideInfo') || 'Guida & info');
              }}
              style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
              className={`w-full px-4 py-3 rounded-xl flex items-center space-x-3.5 text-zinc-400 font-bold text-base transition-all group ${
                !accountName ? 'opacity-40' : 'hover:bg-[#15151a] hover:text-white'
              }`}
            >
              <BookOpen strokeWidth={2.8} className="h-5 w-5 shrink-0 text-white transition-all group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 12px #ffffff)' }} />
              <span>{t('guideInfo') || 'Guida & info'}</span>
              {!accountName && <Lock className="h-4 w-4 ml-auto text-zinc-500" />}
            </button>

            <button
              type="button"
              onMouseEnter={() => { if (accountName && audioActive) sounds.playHover(); }}
              onClick={() => {
                if (!accountName) return;
                if (audioActive) sounds.playClick();
                setActiveTab('COMMUNITY');
              }}
              style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
              className={`w-full px-4 py-3 rounded-xl flex items-center space-x-3.5 text-zinc-400 font-bold text-base transition-all group ${
                !accountName ? 'opacity-40' : 'hover:bg-[#15151a] hover:text-white'
              }`}
            >
              <MessageCircle strokeWidth={2.8} className="h-5 w-5 shrink-0 text-white transition-all group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 12px #ffffff)' }} />
              <span>{t('community') || 'Community'}</span>
              {!accountName && <Lock className="h-4 w-4 ml-auto text-zinc-500" />}
            </button>

            <button
              type="button"
              onMouseEnter={() => { if (accountName && audioActive) sounds.playHover(); }}
              onClick={() => {
                if (!accountName) return;
                if (audioActive) sounds.playClick();
                setActiveTab('ASSISTENZA');
              }}
              style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
              className={`w-full px-4 py-3 rounded-xl flex items-center space-x-3.5 text-zinc-400 font-bold text-base transition-all group ${
                !accountName ? 'opacity-40' : 'hover:bg-[#15151a] hover:text-white'
              }`}
            >
              <HelpCircle strokeWidth={2.8} className="h-5 w-5 shrink-0 text-white transition-all group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 12px #ffffff)' }} />
              <span>{t('support') || 'Assistenza'}</span>
              {!accountName && <Lock className="h-4 w-4 ml-auto text-zinc-500" />}
            </button>

            <button
              type="button"
              onMouseEnter={() => { if (accountName && audioActive) sounds.playHover(); }}
              onClick={() => {
                if (!accountName) return;
                if (audioActive) sounds.playClick();
                setActiveTab('SETTING');
              }}
              style={{ cursor: accountName ? 'pointer' : 'not-allowed' }}
              className={`w-full px-4 py-3 rounded-xl flex items-center space-x-3.5 text-zinc-400 font-bold text-base transition-all group ${
                !accountName ? 'opacity-40' : 'hover:bg-[#15151a] hover:text-white'
              }`}
            >
              <Settings strokeWidth={2.8} className="h-5 w-5 shrink-0 text-white transition-all group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 12px #ffffff)' }} />
              <span>{t('settings') || 'Impostazioni'}</span>
              {!accountName && <Lock className="h-4 w-4 ml-auto text-zinc-500" />}
            </button>
          </nav>
        )}
      </div>
    </aside>
  );
};

const SetModule: React.FC<{ 
  cards: SorareCard[]; 
  audioActive: boolean;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  currentLang?: 'IT' | 'EN' | 'FR' | 'ES';
}> = ({ cards, audioActive, notifications, onClearNotifications, currentLang = 'IT' }) => {
  const t = (key: string) => translations[currentLang]?.[key] || key;

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-end items-center mb-2">
        <NotificationBell audioActive={audioActive} notifications={notifications} onClearNotifications={onClearNotifications} currentLang={currentLang} />
      </div>
      <div className="bg-[#16161a] border border-[#2a2a32] p-8 rounded-2xl flex items-center space-x-4 text-white shadow-md">
        <div className="w-14 h-14 rounded-2xl bg-[#16161a] border border-[#2a2a32] flex items-center justify-center shadow-xl shrink-0">
          <span className="text-xs bg-white text-black px-2 py-0.5 rounded font-black leading-tight">SET</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold">{t('setCardsManagement') || 'Gestione Carte Set'}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {t('setCardsSubtitle')?.replace('{count}', String(cards.length)) || `Visualizza e gestisci le tue carte Set e Common (${cards.length} totali in galleria).`}
          </p>
        </div>
      </div>

      <div className="bg-[#16161a] border border-[#2a2a32] p-16 rounded-2xl flex flex-col items-center justify-center text-center shadow-md space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-white/10 text-white border border-white/20 flex items-center justify-center text-2xl font-black shadow-[0_0_16px_rgba(255,255,255,0.3)]">
          ⏳
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-wider">{t('setCardsManagement') || 'Gestione Carte Set'}</h3>
        <p className="text-sm font-bold text-zinc-300 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
          {t('comingSoon') || 'Coming Soon'}
        </p>
      </div>
    </div>
  );
};

interface DailyMissionsModuleProps {
  cards: SorareCard[];
  missions: DailyMission[];
  setMissions: React.Dispatch<React.SetStateAction<DailyMission[]>>;
  token: string;
  audioActive: boolean;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  currentLang?: 'IT' | 'EN' | 'FR' | 'ES';
}

const DailyMissionsModule: React.FC<DailyMissionsModuleProps> = ({ 
  cards, 
  missions, 
  setMissions, 
  token, 
  audioActive, 
  notifications, 
  onClearNotifications,
  currentLang = 'IT'
}) => {
  const t = (key: string) => translations[currentLang]?.[key] || translations['IT']?.[key] || key;

  const [activeSubTab, setActiveSubTab] = useState<'DAILY' | 'COLLECTION'>('DAILY');
  const [replacingSlot, setReplacingSlot] = useState<{ missionId: string; slotIndex: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const proCards = cards.filter((c) => {
    const r = (c.rarity || '').toUpperCase();
    return r !== 'SET' && r !== 'COMMON';
  });

  const isCardFreeAndAvailable = (card: SorareCard, alreadyUsedIds: Set<string>): boolean => {
    if (!card.isAvailable || !card.hasUpcomingGame) return false;
    if (card.isListedForSale) return false;
    if (card.isInOffer) return false;
    if (alreadyUsedIds.has(card.id)) return false;
    return true;
  };

  const calculateAdvancedMissionScore = (card: SorareCard, type: MissionType): number => {
    let score = 0;
    if (card.isHome) score += 30;

    if (type === 'GOALS') {
      if (card.position === 'Forward') score += 100;
      else if (card.position === 'Midfielder') score += 40;
      else if (card.position === 'Defender') score += 0;
      else if (card.position === 'Goalkeeper') score -= 200;
    } else if (type === 'PASSES' || type === 'ATTACK_PASSES') {
      if (card.position === 'Midfielder') score += 40; 
      else if (card.position === 'Defender') score += 100; 
      else score += 0; 
    } else if (type === 'TACKLES') {
      if (card.position === 'Defender' || card.position === 'Midfielder') score += 90;
      else score += 10; 
    } else if (type === 'DECISIVE') {
      score += (card.l5Average * 2);
    }

    score += (card.l10Average * 0.4);
    score += (card.l5Average * 0.6);
    const decisiveL10Count = (card as any).decisiveL10Count || 0;
    score += (decisiveL10Count * 105);

    return score;
  };

  const executeAutoFill = (): DailyMission[] => {
    if (proCards.length === 0 || missions.length === 0) return missions;
    const usedCardIds = new Set<string>();

    return missions.map((mission) => {
      const eligible = proCards.filter((c) => isCardFreeAndAvailable(c, usedCardIds));
      
      eligible.sort((a, b) => {
        const scoreA = calculateAdvancedMissionScore(a, mission.type);
        const scoreB = calculateAdvancedMissionScore(b, mission.type);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return b.l5Average - a.l5Average;
      });

      const selected: (SorareCard | null)[] = [null, null, null];
      for (let i = 0; i < 3; i++) {
        if (eligible[i]) {
          selected[i] = eligible[i];
          usedCardIds.add(eligible[i].id);
        }
      }

      const filledCount = selected.filter(Boolean).length;
      return {
        ...mission,
        selectedCards: selected,
        completed: filledCount === 3,
      };
    });
  };

  const handleRefreshMissions = async () => {
    setSubmitStatus(t('syncingMissions'));

    try {
      const response = await fetch(`${API_BASE_URL}/api/fetch-missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const text = await response.text();
      if (!text) throw new Error('Empty response');

      let data = JSON.parse(text);
      if (!response.ok) throw new Error(data.error || 'Error');

      const fetchedList = data.missions || data;
      if (Array.isArray(fetchedList)) {
        const formattedMissions = fetchedList.map((m: any) => ({
          id: m.id || (m.titolo || m.title || 'missione').toLowerCase().replace(/\s+/g, '-'),
          title: m.title || m.titolo || 'Mission',
          type: m.type || 'DECISIVE',
          description: m.description || m.descrizione || '',
          reward: m.reward || 'Reward',
          requiredCount: 3,
          selectedCards: m.selectedCards || [null, null, null],
          completed: m.completed || false
        }));

        setMissions(formattedMissions);
        setSubmitStatus(`✅ ${formattedMissions.length} ${t('missionsUpdatedSuccess')}`);
      }
    } catch (error: any) {
      setSubmitStatus(`❌ ${error.message}`);
    }
  };

  const handleSelectAndSubmit = async () => {
    if (proCards.length === 0 || missions.length === 0) return;
    const eligibleCardsForToday = proCards.filter((c) => c.isAvailable && c.hasUpcomingGame === true);

    if (eligibleCardsForToday.length < 3) {
      setSubmitStatus(t('noCardsAvailableForMission'));
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    const updatedMissions = executeAutoFill();
    setMissions(updatedMissions);

    const submissionsPayload = updatedMissions
      .filter((m) => m.selectedCards && m.selectedCards.some(Boolean))
      .map((m) => ({
        missionId: m.id,
        cardIds: (m.selectedCards || []).filter(Boolean).map((c) => c!.id)
      }));

    if (submissionsPayload.length === 0) {
      setSubmitStatus(t('noEligibleCardsToSend'));
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/submit-missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, submissions: submissionsPayload })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error');

      setSubmitStatus(t('missionsSentSuccess'));
    } catch (err: any) {
      setSubmitStatus(`❌ Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearAllMissions = () => {
    setMissions((prev) =>
      prev.map((mission) => ({
        ...mission,
        selectedCards: [null, null, null],
        completed: false,
      }))
    );
    setSubmitStatus(t('missionsCleared'));
  };

  const handleSelectReplacementCard = (card: SorareCard) => {
    if (!replacingSlot) return;

    setMissions((prev) =>
      prev.map((mission) => {
        if (mission.id !== replacingSlot.missionId) return mission;
        const safeCards = mission.selectedCards || [null, null, null];
        const newSelected = [...safeCards];
        newSelected[replacingSlot.slotIndex] = card;
        const filledCount = newSelected.filter(Boolean).length;

        return {
          ...mission,
          selectedCards: newSelected,
          completed: filledCount === 3,
        };
      })
    );

    setReplacingSlot(null);
    setSearchQuery('');
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'LIMITED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'RARE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'SUPER_RARE': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'UNIQUE': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-[#282834] text-zinc-300 border-zinc-700';
    }
  };

  const getAvailableReplacementCards = (): SorareCard[] => {
    if (!replacingSlot) return [];
    const usedCardIds = new Set<string>();
    missions.forEach((m) => {
      const safeCards = m.selectedCards || [];
      safeCards.forEach((c, idx) => {
        if (c && !(m.id === replacingSlot.missionId && idx === replacingSlot.slotIndex)) {
          usedCardIds.add(c.id);
        }
      });
    });

    return proCards
      .filter((c) => isCardFreeAndAvailable(c, usedCardIds))
      .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.team.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.l5Average - a.l5Average);
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-end items-center mb-2">
        <NotificationBell audioActive={audioActive} notifications={notifications} onClearNotifications={onClearNotifications} currentLang={currentLang} />
      </div>
      <div className="bg-[#16161a] border border-[#2a2a32] p-8 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#16161a] border border-[#2a2a32] flex items-center justify-center shadow-xl shrink-0">
            <Target strokeWidth={2.8} className="h-7 w-7 text-[#00bfff]" style={{ filter: 'drop-shadow(0 0 14px #00bfff)' }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{t('missionsManager')}</h2>
            <p className="text-xs text-zinc-400 mt-1">{t('missionsManagerSubtitle')}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <button
            type="button"
            onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
            onClick={() => { if (audioActive) sounds.playClick(); handleRefreshMissions(); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-3 rounded-xl flex items-center space-x-2 transition-all text-xs uppercase tracking-wider shadow cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{t('refreshMissions')}</span>
          </button>

          <button
            type="button"
            onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
            onClick={() => { if (audioActive) sounds.playClick(); handleSelectAndSubmit(); }}
            disabled={proCards.length === 0 || missions.length === 0 || isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-6 py-3 rounded-xl flex items-center space-x-2 transition-all text-xs uppercase tracking-wider disabled:opacity-55 shadow cursor-pointer"
          >
            {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current text-black" />}
            <span>{isSubmitting ? t('processing') : t('selectAndSubmit')}</span>
          </button>

          <button
            type="button"
            onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
            onClick={() => { if (audioActive) sounds.playClick(); handleClearAllMissions(); }}
            disabled={missions.length === 0}
            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold px-4 py-3 rounded-xl flex items-center space-x-2 transition-all text-xs uppercase tracking-wider shadow cursor-pointer"
          >
            <X className="h-4 w-4" />
            <span>{t('clearAll')}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-3 bg-[#121216] p-1.5 rounded-xl border border-[#222228] w-fit">
        <button
          type="button"
          onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
          onClick={() => { if (audioActive) sounds.playClick(); setActiveSubTab('DAILY'); }}
          className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'DAILY' ? 'bg-[#1c1c24] text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {t('dailyMissionsTab')}
        </button>
        <button
          type="button"
          onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
          onClick={() => { if (audioActive) sounds.playClick(); setActiveSubTab('COLLECTION'); }}
          className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeSubTab === 'COLLECTION' ? 'bg-[#1c1c24] text-white shadow' : 'text-zinc-400 hover:text-white'
          }`}
        >
          {t('collectionMissionsTab')}
        </button>
      </div>

      {activeSubTab === 'COLLECTION' ? (
        <div className="bg-[#16161a] border border-[#2a2a32] p-16 rounded-2xl flex flex-col items-center justify-center text-center shadow-md space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-2xl font-black shadow-[0_0_16px_rgba(99,102,241,0.5)]">
            ⏳
          </div>
          <h3 className="text-xl font-black text-white uppercase tracking-wider">{t('collectionMissionsTab')}</h3>
          <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">
            {t('comingSoon')}
          </p>
        </div>
      ) : (
        <>
          {submitStatus && (
            <div className={`p-4 rounded-xl border text-xs font-bold ${submitStatus.includes('❌') ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
              {submitStatus}
            </div>
          )}

          {proCards.length === 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center space-x-3 text-amber-400 text-sm font-bold">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{t('noLimitedCardsWarning')}</span>
            </div>
          )}

          <div className="space-y-4">
            {missions.length === 0 ? (
              <div className="bg-[#16161a] border border-[#2a2a32] p-8 rounded-2xl text-center text-zinc-400 text-sm font-bold uppercase">
                {t('noMissionsSynced')}
              </div>
            ) : (
              missions.map((mission) => {
                const safeSelectedCards = mission.selectedCards || [null, null, null];
                const filledCount = safeSelectedCards.filter(Boolean).length;

                return (
                  <div key={mission.id} className={`bg-[#16161a] border rounded-2xl p-6 transition-all space-y-4 shadow-md ${mission.completed ? 'border-emerald-500/40' : 'border-[#2a2a32]'}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-black text-white">{mission.title}</h3>
                          {mission.completed ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-0.5 rounded-lg text-xs font-black uppercase flex items-center space-x-1">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>{t('completedSlot')} (3/3)</span>
                            </span>
                          ) : (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-0.5 rounded-lg text-xs font-black uppercase">
                              {t('incompleteSlot')} ({filledCount}/3)
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-300 mt-1">{mission.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      {[0, 1, 2].map((index) => {
                        const card = safeSelectedCards[index];

                        return (
                          <div key={index} className={`p-4 rounded-xl border relative transition-all ${card ? 'bg-[#1c1c22] border-[#323240]' : 'bg-[#101014] border-dashed border-[#282834] flex items-center justify-center min-h-[125px]'}`}>
                            {card ? (
                              <div className="flex items-center space-x-4 w-full relative">
                                <div className="w-16 h-20 bg-black rounded-lg overflow-hidden border border-[#2a2a32] shrink-0 relative shadow flex items-center justify-center">
                                  <img src={card.pictureUrl} alt={card.name} className="w-full h-full object-contain" />
                                </div>

                                <div className="overflow-hidden flex-1 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getRarityBadge(card.rarity)}`}>
                                      {card.rarity}
                                    </span>
                                    <button
                                      type="button"
                                      onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
                                      onClick={() => { if (audioActive) sounds.playClick(); setReplacingSlot({ missionId: mission.id, slotIndex: index }); }}
                                      className="text-xs font-bold text-zinc-200 hover:text-white bg-[#282834] hover:bg-[#323242] px-2.5 py-1 rounded-lg border border-[#3a3a4c] flex items-center space-x-1 transition-all cursor-pointer"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                      <span>{t('change')}</span>
                                    </button>
                                  </div>

                                  <h4 className="font-black text-white text-sm truncate leading-snug">{card.name}</h4>

                                  <div className="flex items-center space-x-1 text-xs text-zinc-300">
                                    {card.isHome ? (
                                      <span className="text-amber-400 font-bold flex items-center"><HomeIcon className="h-3 w-3 mr-1" /> {t('homeVs')}</span>
                                    ) : (
                                      <span className="text-cyan-400 font-bold flex items-center"><Plane className="h-3 w-3 mr-1" /> {t('awayVs')}</span>
                                    )}
                                    <span className="font-bold text-zinc-100 truncate">{card.opponent}</span>
                                  </div>

                                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#282834] mt-1">
                                    <span className="bg-amber-400 text-black font-black px-2 py-0.5 rounded text-[10px]">
                                      L5: {card.l5Average}
                                    </span>
                                    <span className="text-zinc-300 font-bold">L10: {card.l10Average}</span>
                                    <span className="text-emerald-400 font-bold flex items-center text-[10px]">
                                      <ShieldCheck className="h-3 w-3 mr-0.5" /> {t('freeCard')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
                                onClick={() => { if (audioActive) sounds.playClick(); setReplacingSlot({ missionId: mission.id, slotIndex: index }); }}
                                className="flex flex-col items-center justify-center text-zinc-400 hover:text-white text-xs font-bold uppercase space-y-1.5 w-full h-full py-4 cursor-pointer"
                              >
                                <Lock className="h-6 w-6 opacity-40" />
                                <span>{t('replaceSlot').replace('{slot}', String(index + 1))}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {replacingSlot && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#16161a] border border-[#2a2a32] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-white uppercase tracking-wide">
                {t('selectReplacementCardTitle').replace('{slot}', String(replacingSlot.slotIndex + 1))}
              </h3>
              <button 
                type="button" 
                onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
                onClick={() => { if (audioActive) sounds.playClick(); setReplacingSlot(null); setSearchQuery(''); }} 
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 absolute left-3.5 top-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder={t('searchPlayerOrTeam')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0e0e12] border border-[#282834] rounded-xl pl-10 pr-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {getAvailableReplacementCards().length === 0 ? (
                <div className="p-8 text-center text-zinc-400 font-bold text-sm uppercase">
                  {t('noEligibleFreeCards')}
                </div>
              ) : (
                getAvailableReplacementCards().map((card) => (
                  <div
                    key={card.id}
                    onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
                    onClick={() => { if (audioActive) sounds.playClick(); handleSelectReplacementCard(card); }}
                    className="p-3.5 bg-[#1c1c22] hover:bg-[#252530] border border-[#282834] rounded-xl flex items-center justify-between cursor-pointer transition-all shadow-sm"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-14 bg-black rounded-lg overflow-hidden border border-[#282834] shrink-0 flex items-center justify-center">
                        <img src={card.pictureUrl} alt={card.name} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-white text-sm">{card.name}</h4>
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${getRarityBadge(card.rarity)}`}>
                            {card.rarity}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-0.5">
                          {card.team} vs <span className="text-zinc-100 font-bold">{card.opponent}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-amber-400 block">L5: {card.l5Average}</span>
                      <span className="text-xs font-bold text-zinc-400">L10: {card.l10Average}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LineupsModule: React.FC<{ 
  cards: SorareCard[]; 
  audioActive: boolean;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  currentLang?: 'IT' | 'EN' | 'FR' | 'ES';
  setActiveTab: (tab: PilotTab) => void;
}> = ({ cards, audioActive, notifications, onClearNotifications, currentLang = 'IT', setActiveTab }) => {
  const t = (key: string) => translations[currentLang]?.[key] || translations['IT']?.[key] || key;
  const [lineupSubTab, setLineupSubTab] = useState<'IN_SEASON' | 'CLASSIC' | 'ROOMS'>('ROOMS');

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-end items-center mb-2">
        <NotificationBell audioActive={audioActive} notifications={notifications} onClearNotifications={onClearNotifications} currentLang={currentLang} />
      </div>
      <div className="bg-[#16161a] border border-[#2a2a32] p-8 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-md">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#16161a] border border-[#2a2a32] flex items-center justify-center shadow-xl shrink-0">
            <Users 
              strokeWidth={2.8}
              className="h-7 w-7 text-[#ffea00]" 
              style={{ filter: 'drop-shadow(0 0 14px #ffea00)' }}
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{t('lineups')}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{t('lineupsSubtitle')}</p>
          </div>
        </div>

        {/* Pulsante Calendario collegato al tab CALENDAR */}
        <button
          type="button"
          onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
          onClick={() => {
            if (audioActive) sounds.playClick();
            setActiveTab('CALENDAR');
          }}
          className="bg-[#16161a] hover:bg-[#202028] border-2 border-[#00ff66] px-5 py-3 rounded-2xl flex items-center space-x-3 transition-all group shadow-2xl cursor-pointer"
          style={{ filter: 'drop-shadow(0 0 16px rgba(0, 255, 102, 0.6))' }}
        >
          <div className="w-9 h-9 rounded-full bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,255,102,0.8)]">
            <Calendar className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-white tracking-widest group-hover:text-[#00ff66] transition-colors uppercase">{t('calendar')}</p>
            <p className="text-[10px] font-bold text-[#00ff66]/80 uppercase tracking-wider">{t('bestMatchups')}</p>
          </div>
        </button>
      </div>

      {/* Sotto-tab delle Formazioni */}
      <div className="flex space-x-2 border-b border-[#2a2a32] pb-4">
        <button
          onClick={() => setLineupSubTab('IN_SEASON')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer ${
            lineupSubTab === 'IN_SEASON'
              ? 'bg-[#ffea00] text-black shadow-lg'
              : 'bg-[#16161a] text-zinc-400 border border-[#2a2a32] hover:text-white'
          }`}
        >
          {t('arenasInSeason')}
        </button>
        <button
          onClick={() => setLineupSubTab('CLASSIC')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer ${
            lineupSubTab === 'CLASSIC'
              ? 'bg-[#ffea00] text-black shadow-lg'
              : 'bg-[#16161a] text-zinc-400 border border-[#2a2a32] hover:text-white'
          }`}
        >
          {t('arenasClassic')}
        </button>
        <button
          onClick={() => setLineupSubTab('ROOMS')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer ${
            lineupSubTab === 'ROOMS'
              ? 'bg-[#ffea00] text-black shadow-lg'
              : 'bg-[#16161a] text-zinc-400 border border-[#2a2a32] hover:text-white'
          }`}
        >
          {t('arenasRooms')}
        </button>
      </div>

      {/* Contenuto Scheda 1: Arene In-Season (Coming Soon) */}
      {lineupSubTab === 'IN_SEASON' && (
        <div className="bg-[#16161a] border border-[#2a2a32] p-20 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#0e0e12] border border-[#ffea00]/30 flex items-center justify-center shadow-inner">
            <Hourglass className="h-8 w-8 text-[#ffea00] animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">{t('arenasInSeason')}</h3>
            <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-[#16161a] border border-[#ffea00]/30 text-xs font-bold text-[#ffea00] tracking-widest uppercase shadow">
              {t('comingSoonStatus')}
            </div>
          </div>
        </div>
      )}

      {/* Contenuto Scheda 2: Arene Classic (Coming Soon) */}
      {lineupSubTab === 'CLASSIC' && (
        <div className="bg-[#16161a] border border-[#2a2a32] p-20 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#0e0e12] border border-[#ffea00]/30 flex items-center justify-center shadow-inner">
            <Hourglass className="h-8 w-8 text-[#ffea00] animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">{t('arenasClassic')}</h3>
            <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-[#16161a] border border-[#ffea00]/30 text-xs font-bold text-[#ffea00] tracking-widest uppercase shadow">
              {t('comingSoonStatus')}
            </div>
          </div>
        </div>
      )}

      {/* Contenuto Scheda 3: Arene Rooms */}
      {lineupSubTab === 'ROOMS' && (
        <div className="space-y-4">
          <LineupBuilder cards={cards} currentLang={currentLang} />
        </div>
      )}
    </div>
  );
};

interface SellingModuleProps {
  cards: SorareCard[];
  token: string;
  audioActive: boolean;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  currentLang?: 'IT' | 'EN' | 'FR' | 'ES';
}

const SellingModule: React.FC<SellingModuleProps> = ({ cards, token, audioActive, notifications, onClearNotifications, currentLang = 'IT' }) => {
  const t = (key: string) => translations[currentLang]?.[key] || translations['IT']?.[key] || key;

  const [autoSellActive, setAutoSellActive] = useState<boolean>(() => {
    return localStorage.getItem('sorare_autosell_active') === 'true';
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sellingStatus, setSellingStatus] = useState<string | null>(null);

  const proCards = cards.filter((c) => {
    const r = (c.rarity || '').toUpperCase();
    return r !== 'SET' && r !== 'COMMON';
  });

  // Carte tornate dalla vendita senza essere state vendute
  const expiredCards = proCards.filter(
    (c: any) => Boolean(c.returnedFromSale) || c.listingStatus === 'RETURNED'
  );

  // Carte tornate non ancora rilistate in questo ciclo
  const pendingRelistCards = expiredCards.filter((c: any) => !c.autoRelisted);

  useEffect(() => {
    localStorage.setItem('sorare_autosell_active', String(autoSellActive));

    if (autoSellActive && pendingRelistCards.length > 0 && !isProcessing) {
      triggerAutoSellApi(pendingRelistCards);
    }
  }, [autoSellActive, cards]);

  const triggerAutoSellApi = async (cardsToRelist: any[]) => {
    if (isProcessing || cardsToRelist.length === 0) return;
    setIsProcessing(true);
    setSellingStatus(t('autoSellRunning'));

    try {
      const payload = cardsToRelist.map((c) => ({
        cardId: c.id,
        priceEur: c.lastPriceEur || c.askingPrice || c.priceEur || 0,
        durationDays: c.lastDurationDays || 7
      }));

      const response = await fetch(`${API_BASE_URL}/api/autosell-relist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, relists: payload })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error');
      }

      setSellingStatus(
        t('autoSellSuccess')?.replace('{count}', String(cardsToRelist.length))
      );
    } catch (err: any) {
      setSellingStatus(`❌ ${t('autoSellError')}: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'LIMITED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'RARE': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'SUPER_RARE': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'UNIQUE': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-[#282834] text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-end items-center mb-2">
        <NotificationBell audioActive={audioActive} notifications={notifications} onClearNotifications={onClearNotifications} currentLang={currentLang} />
      </div>
      <div className="bg-[#16161a] border border-[#2a2a32] p-8 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-md">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#16161a] border border-[#2a2a32] flex items-center justify-center shadow-xl shrink-0">
            <DollarSign
              strokeWidth={2.8}
              className="h-7 w-7 text-[#ff003c]"
              style={{ filter: 'drop-shadow(0 0 14px #ff003c)' }}
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{t('selling')}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{t('sellingSubtitle')}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 bg-[#0e0e12] border border-[#282834] px-5 py-3 rounded-2xl shadow-inner">
          <div className="flex flex-col text-left">
            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center">
              <Power className={`h-3.5 w-3.5 mr-1.5 ${autoSellActive ? 'text-red-500' : 'text-zinc-500'}`} />
              Auto-Sell
            </span>
            <span className="text-[10px] text-zinc-400">
              {autoSellActive ? t('autoSellOn') : t('autoSellOff')}
            </span>
          </div>

          <button
            type="button"
            onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
            onClick={() => {
              if (audioActive) sounds.playClick();
              setAutoSellActive(!autoSellActive);
            }}
            className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors cursor-pointer ${autoSellActive ? 'bg-red-600 shadow-[0_0_12px_rgba(239,68,68,0.7)]' : 'bg-zinc-700'}`}
          >
            <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${autoSellActive ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {sellingStatus && (
        <div className={`p-4 rounded-xl border text-xs font-bold ${sellingStatus.includes('❌') ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
          {sellingStatus}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {expiredCards.length === 0 ? (
          <div className="col-span-full bg-[#16161a] border border-[#2a2a32] py-14 px-8 rounded-2xl flex flex-col items-center justify-center text-center shadow-md text-zinc-400 font-bold text-sm uppercase">
            {t('noExpiredCards')}
          </div>
        ) : (
          expiredCards.map((card: any) => (
            <div key={card.id} className="bg-[#16161a] border border-[#2a2a32] p-4 rounded-xl flex items-center space-x-4 shadow-sm">
              <div className="w-16 h-20 bg-black rounded-lg overflow-hidden border border-[#2a2a32] shrink-0 flex items-center justify-center">
                <img src={card.pictureUrl} alt={card.name} className="w-full h-full object-contain" />
              </div>
              <div className="overflow-hidden flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${getRarityBadge(card.rarity)}`}>
                    {card.rarity}
                  </span>
                  <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 font-black px-1.5 py-0.5 rounded uppercase">
                    {t('expiredCardBadge')}
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm truncate mt-1">{card.name}</h4>
                <p className="text-xs text-zinc-400 truncate">{card.team}</p>
                <div className="flex items-center justify-between text-xs mt-1.5 pt-1 border-t border-[#2a2a32]">
                  <span className="text-amber-400 font-bold">L5: {card.l5Average}</span>
                  <span className="text-emerald-400 font-bold">{t('priceLabel')}: €{card.lastPriceEur || card.askingPrice || card.priceEur || '--'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const CraftModule: React.FC<{ 
  audioActive: boolean;
  notifications: AppNotification[];
  onClearNotifications: () => void;
  currentLang?: 'IT' | 'EN' | 'FR' | 'ES';
}> = ({ audioActive, notifications, onClearNotifications, currentLang = 'IT' }) => {
  const t = (key: string) => translations[currentLang]?.[key] || translations['IT']?.[key] || key;

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-end items-center mb-2">
        <NotificationBell audioActive={audioActive} notifications={notifications} onClearNotifications={onClearNotifications} currentLang={currentLang} />
      </div>
      <div className="bg-[#16161a] border border-[#2a2a32] p-8 rounded-2xl flex items-center space-x-4 text-white shadow-md">
        <div className="w-14 h-14 rounded-2xl bg-[#16161a] border border-[#2a2a32] flex items-center justify-center shadow-xl shrink-0">
          <CraftingCapsuleIcon className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{t('craftingManager')}</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{t('craftingSubtitle')}</p>
        </div>
      </div>

      <div className="bg-[#16161a] border border-[#2a2a32] p-16 rounded-2xl flex flex-col items-center justify-center text-center shadow-md space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-[#d000ff]/20 text-[#d000ff] border border-[#d000ff]/30 flex items-center justify-center text-2xl font-black shadow-[0_0_16px_rgba(208,0,255,0.4)]">
          ⏳
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-wider">{t('crafting')}</h3>
        <p className="text-sm font-bold text-[#d000ff] uppercase tracking-widest bg-[#d000ff]/10 px-4 py-1.5 rounded-full border border-[#d000ff]/20">
          {t('comingSoon')}
        </p>
      </div>
    </div>
  );
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || window.location.origin;

export default function App() {
  const [activeTab, setActiveTab] = useState<PilotTab>('HOME');
  const [myClubSubTab, setMyClubSubTab] = useState<'GALLERIA' | 'ALLENAMENTO' | 'CASSAFORTE'>('GALLERIA');
  const [clubSortBy, setClubSortBy] = useState<string>('novita');
  
  const [currentLang, setCurrentLang] = useState<'IT' | 'EN' | 'FR' | 'ES'>(() => {
    return (localStorage.getItem('sorare_lang') as 'IT' | 'EN' | 'FR' | 'ES') || 'IT';
  });

  const handleLanguageChange = (lang: 'IT' | 'EN' | 'FR' | 'ES') => {
    setCurrentLang(lang);
    localStorage.setItem('sorare_lang', lang);
  };
  
  const [playerSearchQuery, setPlayerSearchQuery] = useState<string>('');
  const [inSeasonOnly, setInSeasonOnly] = useState<boolean>(false);
  const [hideListedCards, setHideListedCards] = useState<boolean>(false);
  const [onlyNotInLineup, setOnlyNotInLineup] = useState<boolean>(false);
  
  const [token, setToken] = useState<string>(() => localStorage.getItem('sorare_token') || '');
  const [accountName, setAccountName] = useState<string>(() => localStorage.getItem('sorare_account_name') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioActive, setAudioActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('sorare_audio');
    return saved === null ? true : saved === 'true';
  });
  const [musicActive, setMusicActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('sorare_music');
    return saved === null ? false : saved === 'true';
  });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playlist = [
    '/audio/1.mp3',
    '/audio/2.mp3',
    '/audio/3.mp3',
    '/audio/4.mp3'
  ];

  useEffect(() => {
    audioRef.current = new Audio(playlist[currentTrackIndex]);
    audioRef.current.volume = 0.4;
    
    audioRef.current.onended = () => {
      setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [currentTrackIndex]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (musicActive) {
      audioRef.current.src = playlist[currentTrackIndex];
      audioRef.current.play().catch(err => console.log("Errore riproduzione musica:", err));
    } else {
      audioRef.current.pause();
    }
  }, [musicActive, currentTrackIndex]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('sorare_auth_token') || localStorage.getItem('sorare_token'));
  });
  const [authError, setAuthError] = useState<string | null>(null);

  const [cards, setCards] = useState<SorareCard[]>(() => {
    const saved = localStorage.getItem('sorare_cards');
    return saved ? JSON.parse(saved) : [];
  });

  const [missions, setMissions] = useState<DailyMission[]>([
    {
      id: 'decisive-picker-live',
      title: 'Decisive Picker',
      type: 'DECISIVE',
      description: 'Seleziona le 3 migliori carte libere con le più alte probabilità di un\'azione decisiva.',
      reward: 'Ricompensa Giornaliera',
      requiredCount: 3,
      selectedCards: [null, null, null],
      completed: false
    }
  ]);

  useEffect(() => {
    localStorage.setItem('sorare_audio', String(audioActive));
  }, [audioActive]);

  useEffect(() => {
    localStorage.setItem('sorare_music', String(musicActive));
  }, [musicActive]);

  const navigateToTab = (tab: PilotTab) => {
    setActiveTab((current) => {
      if (current !== tab) {
        window.history.pushState({ tab }, '', window.location.pathname + window.location.search);
      }
      return tab;
    });
  };

  useEffect(() => {
    if (!accountName) return;

    window.history.replaceState({ tab: 'HOME', guard: true }, '', window.location.pathname);
    window.history.pushState({ tab: activeTab }, '', window.location.pathname);

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab as PilotTab);
        if (event.state.guard) {
          window.history.pushState({ tab: event.state.tab }, '', window.location.pathname);
        }
      } else {
        setActiveTab('HOME');
        window.history.pushState({ tab: 'HOME' }, '', window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [accountName]);

  useEffect(() => {
    const savedToken = localStorage.getItem('sorare_token');
    const savedName = localStorage.getItem('sorare_account_name');
    if (savedToken && savedName && !accountName) {
      setToken(savedToken);
      setAccountName(savedName);
      setIsAuthenticated(true);
      if (cards.length === 0) {
        syncAllCardsInBackground(savedToken, true);
      }
    }
  }, []);

 const exchangeCodeForToken = async (code: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/sorare/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          redirectUri: REDIRECT_URI,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante lo scambio del codice OAuth');
      }

      const authToken = data.token || data.access_token;
      const nickname = data.nickname || data.username || 'SorareUser';

      if (authToken) {
        setToken(authToken);
        localStorage.setItem('sorare_token', authToken);
        localStorage.setItem('sorare_auth_token', authToken);
        setIsAuthenticated(true);
        setAccountName(nickname);
        localStorage.setItem('sorare_account_name', nickname);
        setAuthError(null);

        await syncAllCardsInBackground(authToken, false);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Accesso Sorare non riuscito');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);

      setIsLoading(true);
      setAuthError(null);
      exchangeCodeForToken(code);
    }
  }, []);

  const handleToggleAudio = () => {
    const nextState = !audioActive;
    setAudioActive(nextState);
    if (nextState) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const tempCtx = new AudioCtx();
          if (tempCtx.state === 'suspended') {
            tempCtx.resume();
          }
        }
      } catch {
        // Ignora errori AudioContext
      }
    }
  };

  const handleToggleMusic = () => {
    setMusicActive((prev) => !prev);
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleSorareOAuthLogin = () => {
    setAuthError(null);
    setIsLoading(true);

    const SORARE_CLIENT_ID = "ct8ISmS-NQQzjS-p9wkMKqURpJ0UnTlgQ3LIal9bcRU";

    const sorareAuthUrl =
      `https://sorare.com/oauth/authorize` +
      `?client_id=${encodeURIComponent(SORARE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent("openid read_user cards lineups")}`;

    window.location.href = sorareAuthUrl;
  };

  const handleLogout = () => {
    const confirmed = window.confirm("Sei sicuro di voler effettuare il logout?");
    if (!confirmed) return;

    setToken('');
    setAccountName('');
    setIsAuthenticated(false);
    setAuthError(null);
    setCards([]);
    setNotifications([]);
    localStorage.clear();
    window.history.replaceState({}, document.title, window.location.pathname);
    setActiveTab('HOME');
  };

  const syncAllCardsInBackground = async (accessToken: string, silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setSyncMessage('Sincronizzazione rapida in corso...');
    }
    setIsBackgroundSyncing(true);

    const releaseOverlayTimer = !silent
      ? setTimeout(() => {
          setIsLoading(false);
          setSyncMessage(null);
        }, 2200)
      : null;

    let hasNext = true;
    let cursor: string | null = null;
    let accumulatedCards: SorareCard[] = [];

    try {
      while (hasNext) {
        const response = await fetch(`${API_BASE_URL}/api/user-cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: accessToken, after: cursor, first: 100 })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Errore nel recupero delle carte');
        }
        const newCards: SorareCard[] = (data.cards || []).map((c: any) => ({
          id: c.id,
          name: c.name || c.slug || 'Giocatore',
          position: c.position || 'Forward',
          rarity: c.rarity || 'LIMITED',
          team: c.team || '',
          l10Average: c.l10Average || 0,
          l5Average: c.l5Average || 0,
          priceEur: c.priceEur || 0,
          xpBonus: c.xpBonus || 0,
          isAvailable: c.isAvailable !== undefined ? c.isAvailable : true,
          hasUpcomingGame: c.hasUpcomingGame !== undefined ? c.hasUpcomingGame : false,
          opponent: c.opponent || 'Nessun match oggi',
          isHome: c.isHome ?? true,
          pictureUrl: c.pictureUrl || 'https://images.sorare.com/cards/default.png',
          slug: c.slug,
          serialNumber: c.serialNumber,
          listingStatus: c.listingStatus || 'EXPIRED',
          askingPrice: c.askingPrice || c.priceEur || 0,
          sealed: c.sealed || false,
          inSeason: c.inSeason || false,
          isInLineup: c.isInLineup || false
        }));
        accumulatedCards = [...accumulatedCards, ...newCards];
        setCards([...accumulatedCards]);

        if (releaseOverlayTimer) {
          clearTimeout(releaseOverlayTimer);
          setIsLoading(false);
          setSyncMessage(null);
        }

        hasNext = data.pageInfo?.hasNextPage || false;
        cursor = data.pageInfo?.endCursor || null;
      }

      localStorage.setItem('sorare_cards', JSON.stringify(accumulatedCards));
      setNotifications((prev) => [
        {
          id: `sync-${Date.now()}`,
          title: 'Sincronizzazione completata',
          message: `${accumulatedCards.length} carte aggiornate con successo.`
        },
        ...prev
      ]);
    } catch (err) {
      console.error('Errore durante il download:', err);
      if (!silent) {
        setSyncMessage('❌ Errore sincronizzazione carte');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } finally {
      if (releaseOverlayTimer) clearTimeout(releaseOverlayTimer);
      setIsLoading(false);
      setSyncMessage(null);
      setIsBackgroundSyncing(false);
    }
  };

  const handleManualSync = () => {
    if (!token || isBackgroundSyncing) return;
    syncAllCardsInBackground(token, false);
  };

  return (
    <div className="h-screen w-screen bg-[#0e0e12] text-zinc-100 flex font-sans overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={navigateToTab} 
        accountName={accountName} 
        onLogout={handleLogout} 
        audioActive={audioActive}
        onToggleAudio={handleToggleAudio}
        currentLang={currentLang}
      />

      <main className="flex-1 px-8 pt-8 pb-12 h-screen overflow-y-auto custom-scrollbar max-w-7xl mx-auto flex flex-col">
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center justify-between text-xs font-bold mb-4 shrink-0">
            <span>{errorMessage}</span>
            <button 
              type="button" 
              onMouseEnter={() => { if (audioActive) sounds.playHover(); }}
              onClick={() => {
                if (audioActive) sounds.playClick();
                setErrorMessage(null);
              }} 
              className="hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {isLoading && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#16161a] border border-[#2a2a32] p-6 rounded-2xl flex items-center space-x-3 text-white shadow-2xl">
              {syncMessage === translations[currentLang]?.syncComplete ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              ) : (
                <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
              )}
              <span className="font-bold text-sm">{syncMessage || translations[currentLang]?.processing || 'Elaborazione in corso...'}</span>
            </div>
          </div>
        )}

        {!accountName ? (
          <div className="flex flex-col items-center justify-center min-h-[85vh] text-center max-w-md mx-auto space-y-6 w-full">
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-white uppercase tracking-wide">
                {translations[currentLang]?.syncAccount || 'Accedi a SorarePilot'}
              </h1>
              <p className="text-xs text-zinc-400">
                Collega il tuo account ufficiale Sorare tramite OAuth per accedere a SorarePilot in modo sicuro.
              </p>
            </div>

            <div className="w-full bg-[#16161a] border border-[#2a2a32] p-6 rounded-2xl space-y-4 text-center shadow-2xl">
              {authError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl text-left">
                  {authError}
                </div>
              )}

              <button
                type="button"
                onClick={handleSorareOAuthLogin}
                disabled={isLoading}
                className="w-full bg-white hover:bg-zinc-200 text-black font-black py-3.5 px-6 rounded-xl uppercase text-xs tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isLoading ? (translations[currentLang]?.processing || 'Reindirizzamento in corso...') : 'Accedi con Sorare'}
              </button>

              <p className="text-[11px] text-zinc-500">
                Verrai reindirizzato su Sorare per autorizzare l'accesso.
              </p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'HOME' && (
              <HomeModule 
                setActiveTab={navigateToTab} 
                onOpenSync={() => {}} 
                onManualSync={handleManualSync} 
                onLogout={handleLogout} 
                accountName={accountName} 
                isSyncing={isBackgroundSyncing} 
                audioActive={audioActive}
                onToggleAudio={handleToggleAudio}
                musicActive={musicActive}
                onToggleMusic={handleToggleMusic}
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
                currentLang={currentLang}
                setCurrentLang={handleLanguageChange}
              />
            )}
            {activeTab === 'SET' && (
              <SetModule 
                cards={cards} 
                audioActive={audioActive} 
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
                currentLang={currentLang}
              />
            )}
            {activeTab === 'MY_CLUB' && (() => {
              const proCards = cards.filter((card: any) => {
                const rarity = (card.rarity || '').toLowerCase();
                return ['limited', 'rare', 'super_rare', 'unique'].includes(rarity);
              });

              const filteredProCards = proCards.filter((card: any) => {
                const matchesSearch = 
                  (card.name || '').toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
                  (card.team || '').toLowerCase().includes(playerSearchQuery.toLowerCase());
                
                if (!matchesSearch) return false;
                if (inSeasonOnly && !card.inSeason) return false;
                if (hideListedCards && card.listingStatus === 'ACTIVE') return false;
                if (onlyNotInLineup && card.isInLineup) return false;

                return true;
              });

              const sortedProCards = [...filteredProCards].sort((a: any, b: any) => {
                if (clubSortBy === 'punteggio_max') {
                  return (b.l5Average || 0) - (a.l5Average || 0);
                } else if (clubSortBy === 'prezzo_max') {
                  return (b.askingPrice || b.priceEur || 0) - (a.askingPrice || a.priceEur || 0);
                } else if (clubSortBy === 'prezzo_min') {
                  return (a.askingPrice || a.priceEur || 0) - (b.askingPrice || b.priceEur || 0);
                } else if (clubSortBy === 'nome') {
                  return (a.name || '').localeCompare(b.name || '');
                } else if (clubSortBy === 'sealing') {
                  const aSealed = a.sealed ? 1 : 0;
                  const bSealed = b.sealed ? 1 : 0;
                  return bSealed - aSealed;
                }
                return 0;
              });

              return (
                <div className="space-y-6 max-w-7xl mx-auto w-full">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#16161a] border border-[#2a2a32] p-6 rounded-2xl shadow-md gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{translations[currentLang]?.myClubTitle || 'Il Mio Club - Carte Pro'}</h2>
                      <p className="text-xs text-zinc-400 mt-1">{translations[currentLang]?.myClubSubtitle || 'Collezione completa delle tue carte pro (Limited, Rare, Super Rare, Unique).'}</p>
                    </div>
                    <div className="text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-4 py-2 rounded-xl">
                      {translations[currentLang]?.totalProCards || 'Totale Carte Pro'}: {sortedProCards.length} / {proCards.length}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 border-b border-[#2a2a32] pb-4">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setMyClubSubTab('GALLERIA')}
                          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer ${
                            myClubSubTab === 'GALLERIA'
                              ? 'bg-amber-500 text-black shadow-lg'
                              : 'bg-[#16161a] text-zinc-400 border border-[#2a2a32] hover:text-white'
                          }`}
                        >
                          {translations[currentLang]?.galleryTab || 'Galleria'}
                        </button>
                        <button
                          onClick={() => setMyClubSubTab('ALLENAMENTO')}
                          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer ${
                            myClubSubTab === 'ALLENAMENTO'
                              ? 'bg-amber-500 text-black shadow-lg'
                              : 'bg-[#16161a] text-zinc-400 border border-[#2a2a32] hover:text-white'
                          }`}
                        >
                          {translations[currentLang]?.trainingTab || 'Allenamento'}
                        </button>
                        <button
                          onClick={() => setMyClubSubTab('CASSAFORTE')}
                          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase transition-all cursor-pointer ${
                            myClubSubTab === 'CASSAFORTE'
                              ? 'bg-amber-500 text-black shadow-lg'
                              : 'bg-[#16161a] text-zinc-400 border border-[#2a2a32] hover:text-white'
                          }`}
                        >
                          {translations[currentLang]?.safeTab || 'Cassaforte'}
                        </button>
                      </div>

                      {myClubSubTab === 'GALLERIA' && proCards.length > 0 && (
                        <div className="flex items-center space-x-2 bg-[#16161a] border border-[#2a2a32] px-3 py-1.5 rounded-xl">
                          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">{translations[currentLang]?.sortBy || 'Ordina per'}:</span>
                          <select
                            value={clubSortBy}
                            onChange={(e) => setClubSortBy(e.target.value)}
                            className="bg-[#0e0e12] text-white text-xs font-bold border border-[#282834] rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                          >
                            <option value="novita">Novità</option>
                            <option value="punteggio_max">Punteggio Medio Massimo (L5/L10)</option>
                            <option value="prezzo_max">Prezzo Massimo</option>
                            <option value="prezzo_min">Prezzo Minimo</option>
                            <option value="nome">Nome Giocatore (A-Z)</option>
                            <option value="sealing">Valore Sealing</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {myClubSubTab === 'GALLERIA' && (
                      <div className="flex flex-wrap items-center gap-3 bg-[#16161a] border border-[#2a2a32] p-3 rounded-xl mt-2">
                        <div className="flex-1 min-w-[220px]">
                          <input
                            type="text"
                            placeholder={translations[currentLang]?.filterPlayerOrTeam || '🔍 Filtra per giocatore o squadra...'}
                            value={playerSearchQuery}
                            onChange={(e) => setPlayerSearchQuery(e.target.value)}
                            className="w-full bg-[#0e0e12] text-white text-xs font-bold border border-[#282834] rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 transition-colors"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setInSeasonOnly(!inSeasonOnly)}
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer border ${
                            inSeasonOnly 
                              ? 'bg-amber-500 text-black border-amber-400 shadow' 
                              : 'bg-[#0e0e12] text-zinc-300 border-[#282834] hover:border-zinc-500'
                          }`}
                        >
                          {inSeasonOnly ? '🟢 In-Season (Attivo)' : translations[currentLang]?.allSeasons || '⚪ Tutte le stagioni'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setHideListedCards(!hideListedCards)}
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer border ${
                            hideListedCards 
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow' 
                              : 'bg-[#0e0e12] text-zinc-300 border-[#282834] hover:border-zinc-500'
                          }`}
                        >
                          {hideListedCards ? '🏷️ Escludi In Vendita' : translations[currentLang]?.showOnSale || '🏷️ Mostra In Vendita'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setOnlyNotInLineup(!onlyNotInLineup)}
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer border ${
                            onlyNotInLineup 
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow' 
                              : 'bg-[#0e0e12] text-zinc-300 border-[#282834] hover:border-zinc-500'
                          }`}
                        >
                          {onlyNotInLineup ? '⚽ Solo Non In Lineup' : translations[currentLang]?.allFormationsFilter || '⚽ Tutte (Formazioni)'}
                        </button>
                      </div>
                    )}
                  </div>

                  {myClubSubTab === 'GALLERIA' && (
                    <>
                      {sortedProCards.length === 0 ? (
                        <div className="text-center py-20 bg-[#16161a] border border-[#2a2a32] rounded-2xl">
                          <p className="text-sm font-bold text-zinc-400">Nessuna carta corrisponde ai filtri selezionati.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                          {sortedProCards.map((card: any) => (
                            <div key={card.id} className="bg-[#16161a] border border-[#2a2a32] p-3 rounded-2xl flex flex-col items-center space-y-2 shadow-lg">
                              <div className="w-28 h-36 rounded-xl overflow-hidden bg-black/40 border border-zinc-800 flex items-center justify-center relative">
                                <img src={card.pictureUrl} alt={card.name} className="w-full h-full object-contain" />
                              </div>
                              <div className="text-center w-full">
                                <p className="text-xs font-black text-white truncate">{card.name}</p>
                                <p className="text-[10px] text-zinc-400">{card.position} | L10: {card.l10Average}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {myClubSubTab === 'ALLENAMENTO' && (
                    <div className="bg-[#16161a] border border-[#2a2a32] p-20 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                      <div className="w-16 h-16 rounded-2xl bg-[#0e0e12] border border-[#2a2a32] flex items-center justify-center shadow-inner">
                        <Hourglass className="h-8 w-8 text-amber-400 animate-spin" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-wider">{translations[currentLang]?.trainingTitle || 'ALLENAMENTO'}</h3>
                        <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-[#0e0e12] border border-[#2a2a32] text-xs font-bold text-zinc-300 tracking-widest uppercase shadow">
                          {translations[currentLang]?.comingSoon || 'Prossimamente'}
                        </div>
                      </div>
                    </div>
                  )}

                  {myClubSubTab === 'CASSAFORTE' && (
                    <div className="bg-[#16161a] border border-[#2a2a32] p-20 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                      <div className="w-16 h-16 rounded-2xl bg-[#0e0e12] border border-[#2a2a32] flex items-center justify-center shadow-inner">
                        <Hourglass className="h-8 w-8 text-amber-400 animate-spin" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-wider">{translations[currentLang]?.safeTitle || 'CASSAFORTE'}</h3>
                        <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-[#0e0e12] border border-[#2a2a32] text-xs font-bold text-zinc-300 tracking-widest uppercase shadow">
                          {translations[currentLang]?.comingSoon || 'Prossimamente'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            {activeTab === 'MISSIONS' && (
              <DailyMissionsModule 
                cards={cards} 
                missions={missions} 
                setMissions={setMissions} 
                token={token} 
                audioActive={audioActive} 
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
                currentLang={currentLang}
              />
            )}
            {activeTab === 'SCOUTING' && (
              <div className="space-y-6 max-w-7xl mx-auto w-full">
                <div className="flex justify-between items-center bg-[#16161a] border border-[#2a2a32] p-6 rounded-2xl shadow-md">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{translations[currentLang]?.scoutingManager || 'Scouting Manager'}</h2>
                    <p className="text-xs text-zinc-400 mt-1">{translations[currentLang]?.scoutingSubtitle || 'Cerca nuovi talenti e monitora il mercato.'}</p>
                  </div>
                </div>

                <div className="bg-[#16161a] border border-[#2a2a32] p-20 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-[#0e0e12] border border-[#2a2a32] flex items-center justify-center shadow-inner">
                    <Hourglass className="h-8 w-8 text-amber-400 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">{translations[currentLang]?.SCOUTING || 'SCOUTING'}</h3>
                    <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-[#0e0e12] border border-[#2a2a32] text-xs font-bold text-zinc-300 tracking-widest uppercase shadow">
                      {translations[currentLang]?.comingSoon || 'Prossimamente'}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'ARENA' && (
              <LineupsModule 
                cards={cards} 
                audioActive={audioActive} 
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
                currentLang={currentLang}
                setActiveTab={navigateToTab}
              />
            )}
            {activeTab === 'CALENDAR' && (
              <div className="space-y-6 max-w-7xl mx-auto w-full">
                <div className="flex justify-between items-center bg-[#16161a] border border-[#2a2a32] p-6 rounded-2xl shadow-md">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{translations[currentLang]?.calendarTitle || 'Calendario Partite'}</h2>
                    <p className="text-xs text-zinc-400 mt-1">{translations[currentLang]?.calendarSubtitle || 'Pianificazione delle Game Week e calendario incontri.'}</p>
                  </div>
                </div>

                <div className="bg-[#16161a] border border-[#2a2a32] p-20 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-[#0e0e12] border border-[#2a2a32] flex items-center justify-center shadow-inner">
                    <Hourglass className="h-8 w-8 text-amber-400 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">CALENDAR</h3>
                    <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-[#0e0e12] border border-[#2a2a32] text-xs font-bold text-zinc-300 tracking-widest uppercase shadow">
                      {translations[currentLang]?.comingSoon || 'Prossimamente'}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'SELLING' && (
              <SellingModule 
                cards={cards} 
                token={token} 
                audioActive={audioActive} 
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
                currentLang={currentLang}
              />
            )}
            {activeTab === 'CRAFT' && (
              <CraftModule 
                cards={cards} 
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
                currentLang={currentLang}
              />
            )}
            {activeTab === 'LIVE' && (
              <LiveModule 
                cards={cards} 
                notifications={notifications} 
                onClearNotifications={handleClearNotifications}
                currentLang={currentLang}
              />
            )}
            {activeTab === 'COMMUNITY' && (
              <CommunityModule 
                audioActive={audioActive}
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
                currentLang={currentLang}
              />
            )}
            {activeTab === 'ASSISTENZA' && (
              <AssistenzaModule 
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
                currentLang={currentLang}
              />
            )}
            {activeTab === 'SETTING' && (
              <SettingModule 
                audioActive={audioActive} 
                onToggleAudio={handleToggleAudio} 
                musicActive={musicActive}
                onToggleMusic={handleToggleMusic}
                cards={cards} 
                accountName={accountName} 
                onLogout={handleLogout} 
                notifications={notifications}
                onClearNotifications={handleClearNotifications}
                currentLang={currentLang}
                onLanguageChange={handleLanguageChange}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
