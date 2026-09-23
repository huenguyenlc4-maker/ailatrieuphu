/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Play, CheckCircle, Pause, Clock, Volume2, VolumeX, 
  Maximize, Minimize, Trophy, Download, FileJson, Copy, 
  Users, FileText, X, FileUp, RotateCcw, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

// --- MOCK DATA MẪU ---
const BG_TRACKS = [
  { id: 'classic', name: 'Kịch tính (Classic)', url: 'https://assets.mixkit.co/active_storage/sfx/2042/2042-preview.mp3' },
  { id: 'suspense', name: 'Hồi hộp (Suspense)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3' },
  { id: 'modern', name: 'Hiện đại (Modern)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'epic', name: 'Hùng tráng (Epic)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' }
];

const demoQuestions = [
  { id: 1, question: "Từ 'Hello' trong tiếng Việt nghĩa là gì?", a: "Tạm biệt", b: "Xin chào", c: "Cảm ơn", d: "Xin lỗi", correct: "B" },
  { id: 2, question: "Đại từ nhân xưng ngôi thứ nhất số ít trong tiếng Anh là gì?", a: "I", b: "You", c: "He", d: "She", correct: "A" },
  { id: 3, question: "Số đếm 'Mười' trong tiếng Anh viết là?", a: "Two", b: "Five", c: "Ten", d: "Nine", correct: "C" },
  { id: 4, question: "Thủ đô của Việt Nam là gì?", a: "TP. Hồ Chí Minh", b: "Đà Nẵng", c: "Hà Nội", d: "Huế", correct: "C" },
  { id: 5, question: "Hành tinh nào gần Mặt Trời nhất?", a: "Sao Kim", b: "Sao Thủy", c: "Sao Hỏa", d: "Trái Đất", correct: "B" },
];

const demoStudents = ["Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Châu", "Phạm Minh Dũng", "Hoàng Thanh Em"];

const MONEY_TREE = [
  { level: 15, amount: "$ 1 MILLION", isMilestone: true },
  { level: 14, amount: "$ 500,000", isMilestone: false },
  { level: 13, amount: "$ 400,000", isMilestone: false },
  { level: 12, amount: "$ 300,000", isMilestone: false },
  { level: 11, amount: "$ 200,000", isMilestone: false },
  { level: 10, amount: "$ 100,000", isMilestone: true },
  { level: 9, amount: "$ 70,000", isMilestone: false },
  { level: 8, amount: "$ 50,000", isMilestone: false },
  { level: 7, amount: "$ 30,000", isMilestone: false },
  { level: 6, amount: "$ 20,000", isMilestone: false },
  { level: 5, amount: "$ 10,000", isMilestone: true },
  { level: 4, amount: "$ 5,000", isMilestone: false },
  { level: 3, amount: "$ 3,000", isMilestone: false },
  { level: 2, amount: "$ 2,000", isMilestone: false },
  { level: 1, amount: "$ 1,000", isMilestone: false }
];

interface Question {
  id: number;
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  correct: string;
}

export default function App() {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'game_over'>('setup');
  
  // Dữ liệu sư phạm
  const [questions, setQuestions] = useState<Question[]>([]);
  const [students, setStudents] = useState<string[]>([]);
  const [currentStudentPlaying, setCurrentStudentPlaying] = useState("");
  const [scoreboard, setScoreboard] = useState<{name: string, score: string, level: number, date: string}[]>([]);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);

  // Gameplay
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [helps, setHelps] = useState({ fifty: true, call: true, crowd: true });
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);

  // Modal Text Input
  const [inputModal, setInputModal] = useState<{ isOpen: boolean; type: 'questions' | 'students' | '' }>({ isOpen: false, type: '' });
  const [rawTextValue, setRawTextValue] = useState("");

  // Refs
  const fileInputRefQuestion = useRef<HTMLInputElement>(null);
  const fileInputRefStudent = useRef<HTMLInputElement>(null);
  const bgMusicRef = useRef<HTMLAudioElement>(null);

  // --- SOUND EFFECTS ---
  const playSound = (type: 'correct' | 'incorrect' | 'lifeline' | 'select' | 'thinking') => {
    if (isAudioMuted) return;
    const sounds = {
      correct: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
      incorrect: 'https://assets.mixkit.co/active_storage/sfx/251/251-preview.mp3',
      lifeline: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
      select: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      thinking: 'https://assets.mixkit.co/active_storage/sfx/2042/2042-preview.mp3' // Reusing classic for thinking
    };
    const audio = new Audio(sounds[type]);
    audio.volume = volume; // Sync with main volume
    audio.play().catch(e => console.log("Sound play blocked", e));
  };

  // --- TRẠNG THÁI UI & ĐIỀU KHIỂN ---
  const [isPaused, setIsPaused] = useState(false);
  const [maxTime, setMaxTime] = useState(45);
  const [timer, setTimer] = useState(45);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [currentTrack, setCurrentTrack] = useState(BG_TRACKS[0]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive && !isPaused && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
      if (gameState === 'playing' && !isAnswerRevealed) {
        setGameState('game_over');
      }
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isTimerActive, isPaused, timer, gameState, isAnswerRevealed]);

  // Audio Control
  useEffect(() => {
    if (bgMusicRef.current) {
        bgMusicRef.current.volume = volume;
        if (!isAudioMuted && gameState === 'playing' && !isPaused) {
            bgMusicRef.current.play().catch(e => console.log("Trình duyệt chặn Autoplay", e));
        } else {
            bgMusicRef.current.pause();
        }
    }
  }, [isAudioMuted, gameState, isPaused, volume]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  // --- LOGIC NHẬP/XUẤT DỮ LIỆU SƯ PHẠM ---
  const handleExportJSON = (type: 'questions' | 'students') => {
    const data = type === 'questions' ? questions : students;
    if(data.length === 0) { alert("Chưa có dữ liệu để xuất!"); return; }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${type}_export.json`);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'questions' | 'students') => {
    const file = e.target.files?.[0];
    if(!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'json') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsedData = JSON.parse(evt.target?.result as string);
          if(type === 'questions') setQuestions(parsedData);
          if(type === 'students') setStudents(parsedData);
          alert(`Đã tải thành công ${parsedData.length} dòng dữ liệu JSON!`);
        } catch(err) { alert("File không đúng định dạng JSON!"); }
      };
      reader.readAsText(file);
    } 
    else if (['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, {type: 'array'});
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, {header: 1}) as any[][];

          if (type === 'questions') {
             let startIndex = 0;
             if (rows.length > 0 && typeof rows[0][0] === 'string' && rows[0][0].toLowerCase().includes('câu')) {
                startIndex = 1;
             }
             const parsedQ: Question[] = [];
             for (let i = startIndex; i < rows.length; i++) {
                const row = rows[i];
                if (row.length >= 6 && row[0]) {
                   parsedQ.push({
                      id: parsedQ.length + 1,
                      question: String(row[0]).trim(),
                      a: String(row[1]).trim(),
                      b: String(row[2]).trim(),
                      c: String(row[3]).trim(),
                      d: String(row[4]).trim(),
                      correct: String(row[5]).trim().toUpperCase()
                   });
                }
             }
             setQuestions(parsedQ);
             alert(`Đã tải thành công ${parsedQ.length} câu hỏi từ file Excel!`);
          } 
          else if (type === 'students') {
             const parsedS: string[] = [];
             let startIndex = 0;
             if (rows.length > 0 && typeof rows[0][0] === 'string' && (rows[0][0].toLowerCase().includes('tên') || rows[0][0].toLowerCase().includes('họ'))) {
                startIndex = 1;
             }
             for (let i = startIndex; i < rows.length; i++) {
                const row = rows[i];
                if (row[0]) parsedS.push(String(row[0]).trim());
                else if (row[1]) parsedS.push(String(row[1]).trim());
             }
             setStudents(parsedS);
             alert(`Đã tải thành công ${parsedS.length} học sinh từ file Excel!`);
          }
        } catch (error) {
           console.error(error);
           alert("Có lỗi xảy ra khi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
    
    e.target.value = ''; 
  };

  const openInputModal = (type: 'questions' | 'students') => {
    setRawTextValue("");
    setInputModal({ isOpen: true, type });
  };

  const handleSaveRawText = () => {
    if(!rawTextValue.trim()) { setInputModal({ isOpen: false, type: '' }); return; }

    if(inputModal.type === 'students') {
        const list = rawTextValue.split('\n').map(s => s.trim()).filter(s => s !== "");
        setStudents(list);
        alert(`Đã nhập ${list.length} học sinh.`);
    } 
    else if(inputModal.type === 'questions') {
        if(rawTextValue.trim().startsWith('[')) {
            try {
                const parsed = JSON.parse(rawTextValue);
                setQuestions(parsed);
                alert(`Đã nhập ${parsed.length} câu hỏi.`);
            } catch(e) { alert("Chuỗi JSON không hợp lệ!"); return; }
        } else {
            const lines = rawTextValue.split('\n').filter(line => line.trim() !== "");
            const parsedQuestions = lines.map((line, idx) => {
                const cols = line.split('\t');
                if(cols.length >= 6) {
                    return {
                        id: idx + 1,
                        question: cols[0].trim(),
                        a: cols[1].trim(),
                        b: cols[2].trim(),
                        c: cols[3].trim(),
                        d: cols[4].trim(),
                        correct: cols[5].trim().toUpperCase()
                    };
                }
                return null;
            }).filter((q): q is Question => q !== null);

            if(parsedQuestions.length > 0) {
                setQuestions(parsedQuestions);
                alert(`Đã phân tích ${parsedQuestions.length} câu hỏi.`);
            } else {
                alert("Lỗi dữ liệu. Cần 6 cột cách nhau bởi Tab (Copy từ Excel).");
                return;
            }
        }
    }
    setInputModal({ isOpen: false, type: '' });
  };

  const loadDemoData = () => {
    setQuestions(demoQuestions);
    setStudents(demoStudents);
  };

  // --- LOGIC GAME ---
  const handleStartGame = () => {
    if (questions.length === 0) return;
    setGameState('playing');
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerRevealed(false);
    setHelps({ fifty: true, call: true, crowd: true });
    setEliminatedOptions([]);
    setTimer(maxTime);
    setIsTimerActive(true);
    playSound('select'); // Start sound
    
    if(bgMusicRef.current && !isAudioMuted) {
        bgMusicRef.current.currentTime = 0;
        bgMusicRef.current.play().catch(e => console.log(e));
    }

    if(students.length > 0) {
        const randomStudent = students[Math.floor(Math.random() * students.length)];
        setCurrentStudentPlaying(randomStudent);
    } else {
        setCurrentStudentPlaying("");
    }
  };

  const handleAnswerClick = (optionKey: string) => {
    if (isAnswerRevealed || eliminatedOptions.includes(optionKey)) return;
    setSelectedAnswer(optionKey);
    setIsTimerActive(false); 
    playSound('select');
    
    // Thinking phase
    playSound('thinking');
    setTimeout(() => {
      setIsAnswerRevealed(true);
      const correct = questions[currentQuestionIndex].correct;
      const isCorrect = optionKey === correct;
      
      if (isCorrect) {
        playSound('correct');
      } else {
        playSound('incorrect');
        // Save score on game over (incorrect answer)
        if (currentStudentPlaying) {
          const newEntry = {
            name: currentStudentPlaying,
            score: currentQuestionIndex > 0 ? MONEY_TREE.find(m => m.level === currentQuestionIndex)?.amount || "$ 0" : "$ 0",
            level: currentQuestionIndex,
            date: new Date().toLocaleString('vi-VN')
          };
          setScoreboard(prev => [newEntry, ...prev].slice(0, 50)); // Keep last 50 scores
        }
      }

      setTimeout(() => {
        if (isCorrect) {
          if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsAnswerRevealed(false);
            setEliminatedOptions([]);
            setTimer(maxTime);
            setIsTimerActive(true);
          } else {
            // Save score on game over (win)
            if (currentStudentPlaying) {
              const newEntry = {
                name: currentStudentPlaying,
                score: MONEY_TREE[0].amount,
                level: 15,
                date: new Date().toLocaleString('vi-VN')
              };
              setScoreboard(prev => [newEntry, ...prev].slice(0, 50));
            }
            setGameState('game_over');
          }
        } else {
          setGameState('game_over');
        }
      }, 3000); // Slightly longer for dramatic effect
    }, 2500); // Thinking time
  };

  const useFiftyFifty = () => {
    if (!helps.fifty || selectedAnswer !== null) return;
    playSound('lifeline');
    const correctAns = questions[currentQuestionIndex].correct;
    const allOpts = ['A', 'B', 'C', 'D'];
    const wrongOpts = allOpts.filter(o => o !== correctAns);
    const shuffledWrong = wrongOpts.sort(() => 0.5 - Math.random());
    setEliminatedOptions([shuffledWrong[0], shuffledWrong[1]]);
    setHelps(prev => ({ ...prev, fifty: false }));
  };

  const useCrowdHelp = () => {
    if (!helps.crowd || selectedAnswer !== null) return;
    playSound('lifeline');
    setHelps(p => ({ ...p, crowd: false }));
  };

  const useCallHelp = () => {
    if (!helps.call || selectedAnswer !== null) return;
    playSound('lifeline');
    setHelps(p => ({ ...p, call: false }));
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60).toString().padStart(2, '0');
    const s = (time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- COMPONENT: TOP HEADER (GEL BUTTONS) ---
  const TopHeaderControls = () => (
    <header className="fixed top-2 md:top-4 left-2 md:left-4 right-2 lg:right-[380px] z-50 flex justify-between items-start pointer-events-none">
      
      <div className="flex flex-wrap items-center gap-1 md:gap-3 pointer-events-auto bg-[#030b2e]/60 p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-blue-500/30 backdrop-blur-md shadow-lg max-w-[65vw] md:max-w-none">
        <button onClick={() => { setIsPaused(!isPaused); setIsTimerActive(!isPaused); }} className="glass-btn-gel group" title="Play/Pause">
          {isPaused ? <Play className="icon-inner text-[#00ff00] fill-[#00ff00] drop-shadow-[0_0_5px_rgba(0,255,0,0.8)] z-10 transition-transform group-hover:scale-110" /> : <Pause className="icon-inner text-[#00ff00] fill-[#00ff00] drop-shadow-[0_0_5px_rgba(0,255,0,0.8)] z-10 transition-transform group-hover:scale-110" />}
        </button>

        <button onClick={() => setIsTimerActive(!isTimerActive)} className="glass-btn-gel group flex items-center justify-center" title="Bật/Tắt Hẹn Giờ">
           <div className="relative z-10 bg-white rounded-full p-0.5 transition-transform group-hover:scale-110">
             <Clock className="icon-inner-small text-red-600" />
           </div>
        </button>

        <button onClick={() => setIsAudioMuted(!isAudioMuted)} className="glass-btn-gel group" title="Âm thanh">
           {isAudioMuted ? <VolumeX className="icon-inner text-black fill-black z-10 transition-transform group-hover:scale-110" /> : <Volume2 className="icon-inner text-black fill-black z-10 transition-transform group-hover:scale-110" />}
        </button>

        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/10 pointer-events-auto">
          <Volume2 size={14} className="text-white/60" />
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume} 
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 md:w-24 h-1 bg-blue-500/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/10 pointer-events-auto">
          <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Thời gian:</span>
          <select 
            value={maxTime}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setMaxTime(val);
              if (gameState === 'setup') setTimer(val);
            }}
            className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
          >
            {[15, 30, 45, 60, 90, 120].map(t => (
              <option key={t} value={t} className="bg-[#0b1338] text-white">{t}s</option>
            ))}
          </select>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/10 pointer-events-auto">
          <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Nhạc:</span>
          <select 
            value={currentTrack.id}
            onChange={(e) => {
              const track = BG_TRACKS.find(t => t.id === e.target.value);
              if (track) setCurrentTrack(track);
            }}
            className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer max-w-[120px]"
          >
            {BG_TRACKS.map(track => (
              <option key={track.id} value={track.id} className="bg-[#0b1338] text-white">
                {track.name}
              </option>
            ))}
          </select>
        </div>

        <button className="glass-btn-gel group" title="Bảng xếp hạng" onClick={() => setIsScoreboardOpen(true)}>
           <Trophy className="icon-inner text-black fill-black z-10 transition-transform group-hover:scale-110" />
        </button>

        <button onClick={toggleFullscreen} className="glass-btn-gel group" title="Toàn Màn Hình">
           {isFullscreen ? <Minimize className="icon-inner text-black z-10 transition-transform group-hover:scale-110" /> : <Maximize className="icon-inner text-black z-10 transition-transform group-hover:scale-110" />}
        </button>

        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="glass-btn-gel group" title="Chế độ sáng/tối">
           {theme === 'dark' ? <Sun className="icon-inner text-black fill-yellow-400 z-10 transition-transform group-hover:scale-110" /> : <Moon className="icon-inner text-black fill-blue-600 z-10 transition-transform group-hover:scale-110" />}
        </button>

        <div className="ml-1 md:ml-2 flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-black/80 rounded-full border border-white/20 shadow-inner cursor-pointer hover:bg-black/60 transition-colors" onClick={() => setIsTimerActive(!isTimerActive)} title="Bật/Tắt Hẹn Giờ">
            <Clock className={`text-[#ffd709] w-4 h-4 md:w-5 md:h-5 ${isTimerActive && !isPaused ? 'animate-pulse' : ''}`} />
            <span className="font-headline font-extrabold text-sm md:text-lg tracking-wider text-white">{formatTime(timer)}</span>
        </div>
      </div>

      <div className="pointer-events-auto flex items-center shrink-0">
        <div className="text-sm sm:text-base md:text-xl lg:text-2xl font-extrabold tracking-tighter text-[#ffd709] drop-shadow-[0_2px_5px_rgba(0,0,0,1)] uppercase italic cursor-pointer hover:scale-105 transition-transform font-headline text-right leading-none" onClick={() => setGameState('setup')}>
          CÔ NGUYỄN THỊ HUỆ
        </div>
      </div>

    </header>
  );

  const PrizeLadder = () => (
    <aside className={`absolute right-4 top-4 bottom-4 w-[330px] md:w-[350px] ${theme === 'dark' ? 'bg-[#6a42b0] border-[#4c2d82]' : 'bg-slate-200 border-slate-300'} rounded-[2.5rem] border-[5px] shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 flex-col p-4 pb-6 overflow-hidden hidden lg:flex`}>
      
      <div className="flex justify-center gap-4 mb-6 mt-2 relative z-10 px-2">
        <button onClick={useFiftyFifty} disabled={!helps.fifty || gameState !== 'playing'} className={`w-[70px] h-10 rounded-full ${theme === 'dark' ? 'bg-[#202b54] text-slate-300' : 'bg-white text-slate-700'} border-[2px] border-slate-500/50 flex items-center justify-center font-bold text-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] hover:opacity-80 transition-colors ${(!helps.fifty || gameState !== 'playing') && 'opacity-30'}`}>
          50:50
        </button>
        <button onClick={useCrowdHelp} disabled={!helps.crowd || gameState !== 'playing'} className={`w-[70px] h-10 rounded-full ${theme === 'dark' ? 'bg-[#202b54] text-slate-300' : 'bg-white text-slate-700'} border-[2px] border-slate-500/50 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] hover:opacity-80 transition-colors ${(!helps.crowd || gameState !== 'playing') && 'opacity-30'}`}>
          <Users size={20} />
        </button>
        <button onClick={useCallHelp} disabled={!helps.call || gameState !== 'playing'} className={`w-[70px] h-10 rounded-full ${theme === 'dark' ? 'bg-[#202b54] text-slate-300' : 'bg-white text-slate-700'} border-[2px] border-slate-500/50 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] hover:opacity-80 transition-colors ${(!helps.call || gameState !== 'playing') && 'opacity-30'}`}>
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>call</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-between px-2 relative z-10">
        {MONEY_TREE.map((item) => {
          const isCurrent = gameState === 'playing' && item.level === currentQuestionIndex + 1;
          const isPassed = gameState === 'playing' && item.level < currentQuestionIndex + 1;
          
          const bgClass = item.isMilestone 
            ? "bg-gradient-to-b from-[#a4ea3c] to-[#5b8c11] border-[#d2fa8c] text-white" 
            : theme === 'dark' 
              ? "bg-gradient-to-b from-[#427fe6] to-[#1c4599] border-[#8cbdfa] text-white"
              : "bg-gradient-to-b from-slate-400 to-slate-600 border-slate-300 text-white";
          
          return (
            <motion.div 
              key={item.level} 
              animate={isCurrent ? { scale: [1, 1.05, 1], x: [0, 5, 0] } : {}}
              transition={isCurrent ? { repeat: Infinity, duration: 2 } : {}}
              className="flex items-center gap-2 relative group"
            >
              <span className={`w-6 text-right font-bold text-xl drop-shadow-md ${theme === 'dark' ? 'text-white' : 'text-slate-800'} ${isCurrent ? 'text-yellow-400 scale-110' : ''} ${isPassed ? 'opacity-60' : ''}`}>
                {item.level}
              </span>
              <span className={`text-cyan-400 text-xs mx-1 ${isCurrent ? 'animate-pulse' : ''} ${isPassed ? 'opacity-60' : ''}`}>♦</span>
              <div className={`flex-1 rounded-full border-[2px] flex items-center h-[34px] px-3 font-bold text-[1.1rem] tracking-wide shadow-[0_4px_4px_rgba(0,0,0,0.4)] transition-all duration-300 ${bgClass} ${isCurrent ? 'ring-[3px] ring-yellow-400 scale-[1.02] bg-gradient-to-b from-[#facc15] to-[#ca8a04] border-[#fef08a] text-black shadow-[0_0_20px_rgba(250,204,21,0.8)]' : ''} ${isPassed ? 'opacity-40 grayscale-[50%]' : ''}`}>
                {item.amount}
              </div>
            </motion.div>
          );
        })}
      </div>
    </aside>
  );

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#050012] text-white' : 'bg-slate-50 text-slate-900'} relative overflow-hidden font-headline select-none overflow-y-auto transition-colors duration-500`}>
      <audio ref={bgMusicRef} loop src={currentTrack.url} preload="auto"></audio>

      <style>{`
        /* GIAO DIỆN NÚT GEL 3D DÀNH RIÊNG - RESPONSIVE (SHRUNK) */
        .glass-btn-gel {
            width: 30px; height: 30px;
            display: flex; align-items: center; justify-content: center;
            position: relative;
            background: linear-gradient(180deg, #3282f6 0%, #09409e 100%);
            border: 1.5px solid #8cbcfc;
            border-radius: 10px;
            box-shadow: 0 3px 8px rgba(0,0,0,0.6), inset 0 -3px 8px rgba(0,0,0,0.5), inset 0 1.5px 4px rgba(255,255,255,0.4);
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.1s ease;
        }
        @media (min-width: 768px) {
            .glass-btn-gel {
                width: 38px; height: 38px;
                border-radius: 12px;
            }
        }
        .glass-btn-gel:active { transform: scale(0.95); }
        .glass-btn-gel::before {
            content: ''; position: absolute;
            top: 1.5px; left: 10%; width: 80%; height: 40%;
            background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%);
            border-radius: 8px 8px 50% 50%;
            pointer-events: none;
            z-index: 5;
        }
        .glass-btn-gel::after {
            content: ''; position: absolute;
            bottom: -1.5px; right: -1.5px; width: 10px; height: 10px;
            background: radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%);
            pointer-events: none;
        }

        .icon-inner { width: 14px; height: 14px; }
        .icon-inner-small { width: 12px; height: 12px; }
        @media (min-width: 768px) {
            .icon-inner { width: 20px; height: 20px; }
            .icon-inner-small { width: 16px; height: 16px; }
        }
      `}</style>

      {/* --- BACKGROUND SÂN KHẤU KINH ĐIỂN --- */}
      <div className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-500">
        {theme === 'dark' ? (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[600px] bg-[radial-gradient(ellipse_at_top,#2b1563_0%,transparent_70%)]"></div>
            <div className="absolute top-[15%] left-0 w-[600px] h-[30px] bg-cyan-400/20 blur-[25px] rotate-[20deg]"></div>
            <div className="absolute top-[15%] right-0 w-[600px] h-[30px] bg-fuchsia-400/20 blur-[25px] -rotate-[20deg]"></div>
            <div className="absolute top-[40%] left-0 w-full h-[2px] bg-fuchsia-600/50 shadow-[0_0_10px_rgba(192,38,211,0.8)]"></div>
            <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[150%] h-[60%] border-[25px] border-[#361c73] rounded-[100%] bg-[#08031a] shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]"></div>
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-slate-100"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[600px] bg-[radial-gradient(ellipse_at_top,#cbd5e1_0%,transparent_70%)]"></div>
            <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[150%] h-[60%] border-[25px] border-slate-300 rounded-[100%] bg-white shadow-[inset_0_0_50px_rgba(0,0,0,0.1)]"></div>
          </>
        )}
      </div>

      <TopHeaderControls />
      <PrizeLadder />

      <div className="relative w-full lg:w-[calc(100%-380px)] min-h-screen flex flex-col items-center justify-start lg:justify-center pt-[100px] lg:pt-10 z-10 pb-10">
        
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`relative flex-shrink-0 transition-all duration-700 ease-in-out z-20 ${gameState === 'setup' ? 'w-[280px] h-[280px] md:w-[450px] md:h-[450px] mb-4 md:mb-[30px]' : 'w-[140px] h-[140px] md:w-[180px] md:h-[180px] opacity-80 mb-4 md:mb-[20px] lg:mt-[-60px]'}`}
        >
          <div className="absolute inset-0 rounded-full border-[8px] md:border-[15px] border-[#1e1a5a] shadow-[0_0_60px_rgba(59,130,246,0.7)] animate-[spin_60s_linear_infinite]"></div>
          <div className="absolute inset-[6px] md:inset-[10px] rounded-full border-[3px] md:border-[5px] border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]"></div>
          <div className="absolute inset-[10px] md:inset-[18px] bg-[radial-gradient(circle_at_center,#1e3a8a_0%,#000000_100%)] rounded-full flex items-center justify-center overflow-hidden">
            <motion.div 
              animate={{ opacity: [0.7, 1, 0.7] }} 
              transition={{ repeat: Infinity, duration: 4 }}
              className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5"
            />
            <span className={`text-white font-bold text-center leading-tight drop-shadow-[0_4px_4px_rgba(0,0,0,1)] transition-all duration-700 ${gameState === 'setup' ? 'text-3xl md:text-6xl px-4 md:px-8' : 'text-xl md:text-2xl px-2'}`}>
              AI LÀ<br/>TRIỆU PHÚ
            </span>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="absolute text-yellow-500/60 font-serif font-bold origin-bottom" style={{ transform: `rotate(${i * 45}deg) translateY(${gameState === 'setup' ? '-110px' : '-50px'})`, fontSize: gameState === 'setup' ? '4rem' : '2rem' }}>?</div>
            ))}
          </div>
        </motion.div>

        <div className="flex-1 w-full flex items-center justify-center relative z-30">
          
          <AnimatePresence mode="wait">
            {gameState === 'setup' && (
              <motion.div 
                key="setup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative w-full h-full flex flex-col items-center justify-center pb-[5%] mt-4 lg:mt-0"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] lg:w-[120%] max-w-[1000px] h-[500px] lg:h-[400px] bg-[#000000]/60 blur-[15px] rounded-[100%] pointer-events-none z-0 shadow-[0_0_50px_rgba(0,0,0,0.9)]"></div>
                
                <div className="relative z-10 flex flex-col items-center w-full max-w-4xl px-4 lg:px-0 font-headline">

                  <div className="flex flex-col md:flex-row gap-6 w-full">
                      
                      <div className={`flex-1 ${theme === 'dark' ? 'bg-gradient-to-br from-[#1a1c2e] to-[#0d0e1a]' : 'bg-white'} backdrop-blur-xl border ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'} rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col gap-4 group hover:border-yellow-500/30 transition-all duration-500`}>
                          <div className="flex justify-between items-center px-1">
                              <span className="text-yellow-400 font-black flex items-center gap-2 text-base tracking-tight uppercase"><FileText size={18}/> Câu Hỏi</span>
                              <span className={`text-[10px] ${theme === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700'} px-2 py-1 rounded-full font-bold border border-yellow-500/20`}>{questions.length} CÂU</span>
                          </div>
                          <input type="file" ref={fileInputRefQuestion} className="hidden" accept=".json,.xlsx,.xls,.csv" onChange={(e) => handleImportFile(e, 'questions')} />
                          
                          <button onClick={() => openInputModal('questions')} className="w-full py-3 bg-gradient-to-b from-[#254174] to-[#1a2e54] hover:from-[#2c4e8a] hover:to-[#223c6b] text-white rounded-xl transition-all duration-300 text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(0,0,0,0.3)] border border-[#3a5d99] active:scale-95">
                              <Copy size={18}/> Dán từ Excel
                          </button>
                          
                          <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => fileInputRefQuestion.current?.click()} className={`py-2.5 ${theme === 'dark' ? 'bg-[#2b2936]/50' : 'bg-slate-100'} hover:bg-slate-200 text-slate-700 dark:text-white rounded-xl text-xs font-bold flex justify-center items-center gap-2 border border-white/10 transition-all`}>
                                  <FileUp size={16}/> Nhập File
                              </button>
                              <button onClick={() => handleExportJSON('questions')} className={`py-2.5 ${theme === 'dark' ? 'bg-[#2b2936]/50' : 'bg-slate-100'} hover:bg-slate-200 text-slate-700 dark:text-white rounded-xl text-xs font-bold flex justify-center items-center gap-2 border border-white/10 transition-all`}>
                                  <Download size={16}/> Xuất File
                              </button>
                          </div>
                      </div>

                      <div className={`flex-1 ${theme === 'dark' ? 'bg-gradient-to-br from-[#1a1c2e] to-[#0d0e1a]' : 'bg-white'} backdrop-blur-xl border ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'} rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col gap-4 group hover:border-green-500/30 transition-all duration-500`}>
                          <div className="flex justify-between items-center px-1">
                              <span className="text-[#4ade80] font-black flex items-center gap-2 text-base tracking-tight uppercase"><Users size={18}/> Học Sinh</span>
                              <span className={`text-[10px] ${theme === 'dark' ? 'bg-green-500/20 text-[#4ade80]' : 'bg-green-100 text-green-700'} px-2 py-1 rounded-full font-bold border border-green-500/20`}>{students.length} EM</span>
                          </div>
                          <input type="file" ref={fileInputRefStudent} className="hidden" accept=".json,.xlsx,.xls,.csv" onChange={(e) => handleImportFile(e, 'students')} />
                          
                          <button onClick={() => openInputModal('students')} className="w-full py-3 bg-gradient-to-b from-[#174828] to-[#0f301b] hover:from-[#1d5c33] hover:to-[#144224] text-white rounded-xl transition-all duration-300 text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(0,0,0,0.3)] border border-[#2a6d3f] active:scale-95">
                              <Copy size={18}/> Dán danh sách
                          </button>
                          
                          <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => fileInputRefStudent.current?.click()} className={`py-2.5 ${theme === 'dark' ? 'bg-[#2b2936]/50' : 'bg-slate-100'} hover:bg-slate-200 text-slate-700 dark:text-white rounded-xl text-xs font-bold flex justify-center items-center gap-2 border border-white/10 transition-all`}>
                                  <FileUp size={16}/> Nhập File
                              </button>
                              <button onClick={() => handleExportJSON('students')} className={`py-2.5 ${theme === 'dark' ? 'bg-[#2b2936]/50' : 'bg-slate-100'} hover:bg-slate-200 text-slate-700 dark:text-white rounded-xl text-xs font-bold flex justify-center items-center gap-2 border border-white/10 transition-all`}>
                                  <Download size={16}/> Xuất File
                              </button>
                          </div>
                      </div>

                  </div>

                  <div className="mt-8 flex flex-col items-center gap-3 w-full">
                      <button 
                          onClick={handleStartGame} 
                          disabled={questions.length === 0}
                          className={`flex w-full md:w-auto items-center justify-center gap-3 font-bold py-3 md:py-4 px-12 rounded-full border-[2px] transition-all duration-300 ${questions.length > 0 ? 'bg-gradient-to-b from-[#16a34a] to-[#14532d] hover:scale-105 text-white border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.6)] cursor-pointer' : 'bg-black/50 text-slate-500 border-slate-700 cursor-not-allowed'}`}
                      >
                          <Play size={22} fill="currentColor" /> <span className="text-lg md:text-xl uppercase tracking-wider">Khởi Động</span>
                      </button>
                      <button onClick={loadDemoData} className="text-blue-300 hover:text-white text-sm underline opacity-80 mt-2">
                          Nạp Dữ Liệu Mẫu
                      </button>
                  </div>

                </div>
              </motion.div>
            )}

            {gameState === 'playing' && (
              <motion.div 
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-4xl px-2 sm:px-4 flex flex-col gap-4 lg:gap-5 mt-4 lg:mt-auto mb-10 lg:mb-[5%] font-headline"
              >
                <div className="flex lg:hidden justify-center gap-3 mb-2 relative z-20">
                  <button onClick={useFiftyFifty} disabled={!helps.fifty} className={`w-12 h-10 rounded-full bg-[#202b54] border-[2px] border-slate-500/50 flex items-center justify-center text-slate-300 font-bold text-xs shadow-inner ${(!helps.fifty) && 'opacity-30'}`}>
                    50:50
                  </button>
                  <button onClick={useCrowdHelp} disabled={!helps.crowd} className={`w-12 h-10 rounded-full bg-[#202b54] border-[2px] border-slate-500/50 flex items-center justify-center text-slate-300 shadow-inner ${(!helps.crowd) && 'opacity-30'}`}>
                    <Users size={18} />
                  </button>
                  <button onClick={useCallHelp} disabled={!helps.call} className={`w-12 h-10 rounded-full bg-[#202b54] border-[2px] border-slate-500/50 flex items-center justify-center text-slate-300 shadow-inner ${(!helps.call) && 'opacity-30'}`}>
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>call</span>
                  </button>
                </div>

                {currentStudentPlaying && (
                  <div className="text-center">
                      <div className="inline-block px-4 py-1 bg-[#1e3a8a]/80 border border-[#97a9ff]/50 rounded-full text-white font-bold text-sm lg:text-[15px] shadow-[0_0_15px_rgba(30,58,138,0.8)]">
                          Học sinh đang thi: <span className="text-[#ffd709]">{currentStudentPlaying}</span>
                      </div>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestionIndex}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex flex-col gap-4 lg:gap-5"
                  >
                    <div className={`relative bg-gradient-to-b ${theme === 'dark' ? 'from-[#0a0f32] to-[#050a24] border-blue-500' : 'from-white to-slate-100 border-slate-300'} border-[2px] lg:border-[3px] rounded-[24px] lg:rounded-[40px] px-6 lg:px-10 py-6 lg:py-8 text-center min-h-[100px] lg:min-h-[140px] flex items-center justify-center shadow-[0_0_20px_rgba(0,100,255,0.4)]`}>
                      <div className="absolute left-0 w-6 lg:w-10 h-full bg-gradient-to-r from-yellow-500/20 to-transparent rounded-l-[20px] lg:rounded-l-[36px]"></div>
                      <div className="absolute right-0 w-6 lg:w-10 h-full bg-gradient-to-l from-yellow-500/20 to-transparent rounded-r-[20px] lg:rounded-r-[36px]"></div>
                      <h2 className={`text-[1.2rem] sm:text-[1.5rem] md:text-[2.2rem] font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'} relative z-10 leading-snug drop-shadow-md`}>
                        {questions[currentQuestionIndex].question}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 lg:gap-y-4">
                      {['A', 'B', 'C', 'D'].map((opt) => {
                        const q = questions[currentQuestionIndex];
                        
                        let bgStyle = theme === 'dark' 
                          ? "from-[#0a0f32] to-[#050a24] border-blue-500 text-white hover:bg-blue-900"
                          : "from-white to-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100";
                        let textStyle = "text-yellow-500";
                        
                        if (eliminatedOptions.includes(opt)) {
                          bgStyle = "from-slate-900 to-black border-slate-800 text-slate-600 opacity-50";
                          textStyle = "text-slate-600";
                        } else if (isAnswerRevealed && opt === q.correct) {
                          bgStyle = "from-green-500 to-green-700 border-green-400 text-white shadow-[0_0_40px_rgba(74,222,128,1)]";
                          textStyle = "text-white";
                        } else if (selectedAnswer === opt) {
                          bgStyle = isAnswerRevealed 
                            ? "from-red-600 to-red-800 border-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.8)]"
                            : "from-yellow-400 to-orange-500 border-yellow-200 text-black animate-pulse shadow-[0_0_20px_rgba(250,204,21,0.8)]";
                          textStyle = isAnswerRevealed ? "text-white" : "text-black";
                        }

                        const isCorrectRevealed = isAnswerRevealed && opt === q.correct;
                        const isWrongSelected = isAnswerRevealed && selectedAnswer === opt && opt !== q.correct;

                        return (
                          <motion.button 
                            key={opt}
                            whileHover={!eliminatedOptions.includes(opt) && !isAnswerRevealed && selectedAnswer === null ? { scale: 1.02, x: opt === 'A' || opt === 'C' ? -5 : 5 } : {}}
                            whileTap={!eliminatedOptions.includes(opt) && !isAnswerRevealed && selectedAnswer === null ? { scale: 0.98 } : {}}
                            animate={
                              isCorrectRevealed 
                                ? { scale: [1, 1.05, 1], transition: { duration: 0.5, repeat: 2 } } 
                                : isWrongSelected 
                                  ? { x: [0, -10, 10, -10, 10, 0], transition: { duration: 0.4 } }
                                  : {}
                            }
                            onClick={() => handleAnswerClick(opt)}
                            disabled={eliminatedOptions.includes(opt) || isAnswerRevealed || selectedAnswer !== null}
                            className={`relative flex items-center border-[2px] lg:border-[3px] rounded-[20px] lg:rounded-[30px] px-4 lg:px-6 py-3 lg:py-5 text-left transition-all duration-300 bg-gradient-to-b ${bgStyle} ${isCorrectRevealed ? 'z-40' : 'z-10'}`}
                          >
                            <span className={`font-black mr-3 lg:mr-4 text-xl lg:text-2xl drop-shadow-md z-10 ${textStyle}`}>{opt}:</span> 
                            <span className={`text-lg lg:text-xl font-bold z-10 ${selectedAnswer === opt && !isAnswerRevealed ? 'text-black' : (theme === 'dark' ? 'text-white' : 'text-slate-800')} drop-shadow-md`}>
                              {q[opt.toLowerCase() as keyof Question] as string}
                            </span>
                            
                            {/* Burst effect for correct answer */}
                            {isCorrectRevealed && (
                              <>
                                <motion.div 
                                  initial={{ opacity: 0.8, scale: 1 }}
                                  animate={{ opacity: 0, scale: 1.5 }}
                                  transition={{ duration: 0.8, repeat: Infinity }}
                                  className="absolute inset-0 border-4 border-green-400 rounded-[20px] lg:rounded-[30px] pointer-events-none"
                                />
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="absolute inset-0 bg-white/30 rounded-[20px] lg:rounded-[30px] pointer-events-none"
                                />
                              </>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}

            {gameState === 'game_over' && (
              <motion.div 
                key="game_over"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0b1338]/95 border-[3px] border-yellow-500 p-8 lg:p-10 rounded-[30px] lg:rounded-[40px] text-center max-w-xl w-11/12 lg:w-full shadow-[0_0_50px_rgba(234,179,8,0.4)] mt-auto mb-[10%] relative z-30 mx-4 lg:mx-0"
              >
                <Trophy size={60} className="mx-auto text-yellow-400 mb-4 lg:w-[80px] lg:h-[80px]" />
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 uppercase">Kết Thúc Lượt</h2>
                {currentStudentPlaying && <div className="text-[#97a9ff] text-base lg:text-lg font-bold mb-6">Người chơi: <span className="text-white">{currentStudentPlaying}</span></div>}
                
                <div className="bg-black/50 p-4 lg:p-6 rounded-[16px] lg:rounded-[20px] border border-yellow-500/30 mb-6 lg:mb-8 shadow-inner">
                  <p className="text-lg lg:text-xl text-slate-300 mb-2">Vượt qua câu số <span className="font-bold text-white">{currentQuestionIndex}</span></p>
                  <div className="text-4xl lg:text-5xl font-black text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
                    {currentQuestionIndex > 0 ? MONEY_TREE.find(m => m.level === currentQuestionIndex)?.amount : "$ 0"}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => setGameState('setup')}
                    className="bg-gradient-to-b from-blue-600 to-blue-800 hover:scale-105 transition-transform px-8 lg:px-10 py-3 lg:py-4 rounded-full font-bold text-white text-lg lg:text-xl border-[2px] border-blue-400 shadow-[0_10px_20px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={20} /> Về Bảng Điều Khiển
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      <AnimatePresence>
        {isScoreboardOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4"
          >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className={`w-full max-w-2xl rounded-3xl border-2 overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] ${theme === 'dark' ? 'bg-[#0b1338] border-yellow-500/50' : 'bg-white border-slate-200'}`}
              >
                  <div className={`p-4 md:p-6 flex justify-between items-center border-b ${theme === 'dark' ? 'bg-blue-900/40 border-yellow-500/30' : 'bg-slate-100 border-slate-200'}`}>
                      <h2 className={`font-black text-xl md:text-2xl flex items-center gap-3 ${theme === 'dark' ? 'text-yellow-400' : 'text-slate-800'}`}>
                          <Trophy size={28} className="text-yellow-500" /> BẢNG XẾP HẠNG
                      </h2>
                      <button onClick={() => setIsScoreboardOpen(false)} className={`${theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}><X size={28}/></button>
                  </div>
                  
                  <div className="p-4 md:p-6 overflow-y-auto max-h-[60vh]">
                      {scoreboard.length === 0 ? (
                        <div className="text-center py-10 opacity-50 italic">Chưa có lượt chơi nào được ghi nhận.</div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className={`text-xs md:text-sm uppercase tracking-wider border-b ${theme === 'dark' ? 'text-yellow-500/70 border-white/10' : 'text-slate-500 border-slate-100'}`}>
                              <th className="pb-3 font-black">Hạng</th>
                              <th className="pb-3 font-black">Tên Học Sinh</th>
                              <th className="pb-3 font-black text-right">Tiền Thưởng</th>
                              <th className="pb-3 font-black text-right hidden sm:table-cell">Ngày Giờ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {scoreboard.sort((a, b) => b.level - a.level).map((entry, index) => (
                              <tr key={index} className={`group transition-colors ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                                <td className="py-4">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]' : index === 1 ? 'bg-slate-300 text-black' : index === 2 ? 'bg-orange-400 text-black' : 'bg-blue-900/30 text-blue-300'}`}>
                                    {index + 1}
                                  </div>
                                </td>
                                <td className={`py-4 font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{entry.name}</td>
                                <td className="py-4 text-right">
                                  <span className="font-black text-green-400 text-lg">{entry.score}</span>
                                </td>
                                <td className={`py-4 text-right text-xs opacity-50 hidden sm:table-cell ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{entry.date}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                  </div>
                  
                  <div className={`p-4 border-t ${theme === 'dark' ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <button onClick={() => setScoreboard([])} className="text-xs text-red-400 hover:text-red-300 underline font-bold">Xóa lịch sử</button>
                  </div>
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inputModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-[#0b1338] border-2 border-blue-400 rounded-2xl w-full max-w-3xl shadow-[0_0_50px_rgba(60,101,255,0.4)] overflow-hidden flex flex-col"
              >
                  <div className="bg-blue-900/60 p-3 md:p-4 flex justify-between items-center border-b border-blue-500/50">
                      <h2 className="text-white font-bold text-lg md:text-xl flex items-center gap-2">
                          {inputModal.type === 'questions' ? <FileText size={20}/> : <Users size={20}/>} 
                          <span className="hidden sm:inline">{inputModal.type === 'questions' ? 'Dán dữ liệu Câu hỏi (Từ Excel)' : 'Nhập danh sách Học sinh'}</span>
                          <span className="sm:hidden">{inputModal.type === 'questions' ? 'Nhập Câu Hỏi' : 'Nhập Học Sinh'}</span>
                      </h2>
                      <button onClick={() => setInputModal({isOpen: false, type: ''})} className="text-white/70 hover:text-white"><X size={24}/></button>
                  </div>
                  
                  <div className="p-4 md:p-6 flex-1 flex flex-col gap-4">
                      <div className="text-xs md:text-sm text-blue-200">
                          {inputModal.type === 'questions' ? (
                              <ul className="list-disc pl-5 space-y-1">
                                  <li>Copy bảng từ Excel và dán vào đây.</li>
                                  <li>Bảng cần 6 cột: <strong>Câu hỏi | Đ.Án A | Đ.Án B | Đ.Án C | Đ.Án D | Đáp án đúng (A/B/C/D)</strong>.</li>
                              </ul>
                          ) : (
                              <p>Mỗi dòng là Tên của một học sinh. Dán thẳng danh sách lớp từ Excel/Word vào đây.</p>
                          )}
                      </div>
                      
                      <textarea 
                          value={rawTextValue}
                          onChange={(e) => setRawTextValue(e.target.value)}
                          className="w-full h-48 md:h-64 bg-black/50 border border-blue-500/40 rounded-xl p-3 md:p-4 text-white font-mono text-sm focus:outline-none focus:border-[#ffd709] resize-none"
                          placeholder={inputModal.type === 'questions' ? "Ví dụ:\nCon mèo là gì?\tDog\tCat\tBird\tFish\tB" : "Nguyễn Văn A\nTrần Thị B"}
                      ></textarea>
                  </div>

                  <div className="p-3 md:p-4 border-t border-blue-500/30 flex justify-end gap-3 bg-black/40">
                      <button onClick={() => setInputModal({isOpen: false, type: ''})} className="px-4 md:px-6 py-2 rounded-lg text-white hover:bg-white/10 transition-colors font-bold text-sm md:text-base">Hủy</button>
                      <button onClick={handleSaveRawText} className="px-4 md:px-6 py-2 rounded-lg bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white font-black transition-colors shadow-[0_0_15px_rgba(34,197,94,0.4)] text-sm md:text-base">Lưu Dữ Liệu</button>
                  </div>
              </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
