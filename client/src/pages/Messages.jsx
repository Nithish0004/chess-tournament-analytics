import React, { useState } from 'react';
import { Search, Send, Users, ShieldCheck, CheckCheck } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../context/AuthContext';

const INITIAL_CONVERSATIONS = [
  {
    id: 'rvce-open',
    name: 'Tournament (RVCE Open)',
    subtitle: '28 participants',
    isChannel: true,
    avatar: 'RV',
    country: 'IN',
    messages: [
      { id: 1, sender: 'Organizer Desk', text: 'Welcome all players to RVCE Open 2026. Round 1 pairings are now live.', time: '09:00 AM', isMe: false },
      { id: 2, sender: 'Aditya V', text: 'What is the time control for round 2?', time: '09:15 AM', isMe: false },
      { id: 3, sender: 'Organizer Desk', text: 'Standard 90+30 Fischer increment.', time: '09:16 AM', isMe: false },
      { id: 4, sender: 'Chief Arbiter', text: 'Round 3 starts at 10:00 AM tomorrow. Please be on time at the main hall.', time: '10:24 AM', isMe: false },
      { id: 5, sender: 'Me', text: 'Noted, thank you!', time: '10:34 AM', isMe: true }
    ]
  },
  {
    id: 'organizers',
    name: 'Organizers Desk',
    subtitle: 'Official Support',
    isChannel: true,
    avatar: 'OD',
    messages: [
      { id: 1, sender: 'Admin', text: 'Your tournament entry has been verified and registered.', time: 'Yesterday', isMe: false },
      { id: 2, sender: 'Me', text: 'Thank you! Can I confirm my board number?', time: 'Yesterday', isMe: true },
      { id: 3, sender: 'Admin', text: 'Yes, you will be on Board 2 in Round 3.', time: 'Yesterday', isMe: false }
    ]
  },
  {
    id: 'aditya-v',
    name: 'Aditya V',
    subtitle: '@adityav · Elo 1672',
    isChannel: false,
    avatar: 'AV',
    country: 'IN',
    messages: [
      { id: 1, sender: 'Aditya V', text: 'Good game today! That knight sacrifice in the endgame was brilliant.', time: 'Oct 30', isMe: false },
      { id: 2, sender: 'Me', text: 'Thanks! I was worried about your queen-side counterplay.', time: 'Oct 30', isMe: true }
    ]
  },
  {
    id: 'team-karnataka',
    name: 'Team Karnataka',
    subtitle: '6 team members',
    isChannel: true,
    avatar: 'TK',
    country: 'IN',
    messages: [
      { id: 1, sender: 'Arjun M', text: 'Meeting at 5 PM today for post-match analysis.', time: 'Oct 29', isMe: false }
    ]
  }
];

export const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState('rvce-open');
  const [search, setSearch] = useState('');
  const [inputMessage, setInputMessage] = useState('');

  const activeConv = conversations.find((c) => c.id === activeId) || conversations[0];

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: user?.full_name || user?.username || 'Me',
      text: inputMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };

    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: [...c.messages, newMsg] } : c))
    );
    setInputMessage('');
  };

  return (
    <div className="h-[calc(100vh-140px)] min-h-[500px] flex flex-col md:flex-row gap-4">
      {/* Left Column: Conversations List */}
      <div className="w-full md:w-80 shrink-0 bg-[#202020] border border-[#303030] rounded-2xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#2d2d2d]">
          <h2 className="text-base font-condensed font-bold uppercase tracking-wider text-white mb-3">
            Messages
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6A15B]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#262626]">
          {filteredConversations.map((conv) => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            const isActive = conv.id === activeId;
            return (
              <button
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors ${
                  isActive ? 'bg-[#282828] border-l-2 border-[#C6A15B]' : 'hover:bg-[#242424]'
                }`}
              >
                <Avatar name={conv.avatar} country={conv.country} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-bold text-white truncate">{conv.name}</span>
                    <span className="text-[10px] text-zinc-500 shrink-0">{lastMsg?.time}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {lastMsg ? `${lastMsg.isMe ? 'You: ' : ''}${lastMsg.text}` : conv.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active Conversation */}
      <div className="flex-1 bg-[#202020] border border-[#303030] rounded-2xl flex flex-col overflow-hidden shadow-sm">
        {/* Chat Header */}
        <div className="p-4 border-b border-[#2d2d2d] bg-[#1a1a1a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={activeConv.avatar} country={activeConv.country} size="md" />
            <div>
              <h3 className="text-sm font-bold text-white">{activeConv.name}</h3>
              <p className="text-[11px] text-zinc-400">{activeConv.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeConv.isChannel && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-zinc-300 flex items-center gap-1">
                <Users className="w-3 h-3 text-[#C6A15B]" /> Channel
              </span>
            )}
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-[#171717]">
          {activeConv.messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}
            >
              {!m.isMe && (
                <span className="text-[10px] font-bold text-zinc-400 mb-1 ml-1">
                  {m.sender}
                </span>
              )}
              <div
                className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  m.isMe
                    ? 'bg-[#2a2418] border border-[#4d3c22] text-[#F5F5F5] rounded-br-none'
                    : 'bg-[#242424] border border-[#333333] text-zinc-200 rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
              <div className="flex items-center gap-1 mt-1 mx-1 text-[10px] text-zinc-500">
                <span>{m.time}</span>
                {m.isMe && <CheckCheck className="w-3 h-3 text-[#C6A15B]" />}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3.5 bg-[#1c1c1c] border-t border-[#2d2d2d] flex items-center gap-2.5">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 text-xs bg-[#242424] border border-[#383838] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#C6A15B]"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="px-4 py-2.5 bg-[#C6A15B] hover:bg-[#d8b167] disabled:opacity-40 disabled:hover:bg-[#C6A15B] text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Messages;
