import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, ShieldCheck, ArrowRight, Calendar, Phone, Building, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { updateProfileApi } from '../api';
import { CountrySelect } from '../components/CountrySelect';
import { Logo } from '../components/Logo';

export const CompleteProfile = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const isPlayer = user?.role !== 'ORGANIZER';

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('UNDISCLOSED');
  const [experienceLevel, setExperienceLevel] = useState('INTERMEDIATE');
  const [country, setCountry] = useState(user?.country_code || 'IN');
  const [phone, setPhone] = useState(user?.phone || '');
  const [organization, setOrganization] = useState(user?.organization || '');
  const [club, setClub] = useState('');
  const [fideId, setFideId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isPlayer) {
      if (!dateOfBirth) {
        showToast('Date of birth is required for tournament pairing', 'error');
        return;
      }
      const dobDate = new Date(dateOfBirth);
      const now = new Date();
      if (dobDate >= now) {
        showToast('Date of birth must be in the past', 'error');
        return;
      }
      const ageDiff = (now - dobDate) / (1000 * 60 * 60 * 24 * 365.25);
      if (ageDiff < 5) {
        showToast('Player must be at least 5 years of age', 'error');
        return;
      }
    } else {
      if (!phone.trim()) {
        showToast('Official contact phone number is required for organizers', 'error');
        return;
      }
      if (!organization.trim()) {
        showToast('Organization or club affiliation name is required', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        full_name: fullName.trim()
      };

      if (isPlayer) {
        payload.date_of_birth = dateOfBirth;
        payload.gender = gender;
        payload.experience_level = experienceLevel;
        payload.country = country;
        payload.country_code = country;
        payload.phone = phone.trim() || undefined;
        payload.club = club.trim() || undefined;
        payload.fide_id = fideId.trim() || undefined;
      } else {
        payload.phone = phone.trim();
        payload.organization = organization.trim();
        payload.country = country;
        payload.country_code = country;
      }

      await updateProfileApi(payload);
      showToast('Profile completed successfully!', 'success');
      if (refreshUser) {
        await refreshUser();
      }
      navigate('/');
    } catch (err) {
      showToast(err.userMessage || 'Failed to update profile details', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#101010] p-6 text-[#F5F5F5]">
      <div className="w-full max-w-xl bg-[#202020] rounded-2xl border border-[#303030] p-8 sm:p-10 shadow-2xl space-y-6">
        <div className="flex justify-center">
          <Logo variant="horizontal" size="sm" linkTo="/" />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-condensed font-bold uppercase tracking-wider text-white">
            Complete Your Profile
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isPlayer
              ? 'Complete your competitor registration to enable tournament participation and official Elo ratings.'
              : 'Provide organization contact details to enable championship management permissions.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
            />
          </div>

          {isPlayer ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Gender Category *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                    <option value="UNDISCLOSED">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Experience Level *
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
                  >
                    <option value="BEGINNER">Beginner (Rating ~1000)</option>
                    <option value="INTERMEDIATE">Intermediate (Rating ~1200)</option>
                    <option value="ADVANCED">Advanced (Rating ~1500)</option>
                    <option value="EXPERT">Expert / Master (Rating ~1800)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Country of Representation *
                  </label>
                  <CountrySelect
                    value={country}
                    onChange={(c) => setCountry(c)}
                    name="country"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Organization / Federation *
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  required
                  placeholder="e.g. Karnataka Chess Association"
                  className="w-full px-3.5 py-2 text-xs bg-[#171717] border border-[#303030] rounded-xl text-white focus:outline-none focus:border-[#C6A15B]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#C6A15B] hover:bg-[#d8b167] text-black font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 mt-4"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>{loading ? 'Saving Profile...' : 'Complete Profile & Continue'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
