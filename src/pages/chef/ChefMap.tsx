import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { MapPin, Star, Clock, ChevronRight } from 'lucide-react';
import { supabase, FoodRequest, ChefProfile } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

type RequestMapRow = FoodRequest & {
  profiles?: { full_name: string; avatar_url: string };
};

type ChefRow = ChefProfile;

function FlyToLocation({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 12, { duration: 1.2 });
    }
  }, [map, position]);
  return null;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ChefMap({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<RequestMapRow[]>([]);
  const [chefProfile, setChefProfile] = useState<ChefRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [center, setCenter] = useState<[number, number]>([6.5244, 3.3792]);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [status, setStatus] = useState<ChefRow['online_status']>('offline');

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);
      const [reqRes, chefRes] = await Promise.all([
        supabase
          .from('food_requests')
          .select('*, profiles!food_requests_customer_id_fkey(full_name, avatar_url, location)')
          .in('status', ['open', 'bidding'])
          .neq('delivery_lat', null)
          .neq('delivery_lng', null)
          .order('created_at', { ascending: false }),
        supabase.from('chef_profiles').select('*').eq('user_id', profile.id).maybeSingle(),
      ]);

      if (reqRes.data) setRequests(reqRes.data as RequestMapRow[]);
      if (chefRes.data) {
        setChefProfile(chefRes.data);
        if (chefRes.data.current_lat && chefRes.data.current_lng) {
          setCenter([chefRes.data.current_lat, chefRes.data.current_lng]);
          setStatus(chefRes.data.online_status);
        }
      }
      setLoading(false);
    }
    load();
  }, [profile]);

  async function updateLocation() {
    if (!navigator.geolocation || !chefProfile) {
      setError('Unable to access location on this device.');
      return;
    }
    setError('');
    setIsSharingLocation(true);
    navigator.geolocation.getCurrentPosition(async position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const { error: updateError } = await supabase.from('chef_profiles').update({
        current_lat: lat,
        current_lng: lng,
        online_status: 'available',
        last_location_updated: new Date().toISOString(),
      }).eq('user_id', profile!.id);
      if (updateError) {
        setError(updateError.message);
      } else {
        setChefProfile(prev => prev ? { ...prev, current_lat: lat, current_lng: lng, online_status: 'available', last_location_updated: new Date().toISOString() } : prev);
        setCenter([lat, lng]);
      }
      setIsSharingLocation(false);
    }, err => {
      setError(err.message || 'Unable to access location.');
      setIsSharingLocation(false);
    }, { enableHighAccuracy: true });
  }

  const requestMarkers = requests.filter(req => req.delivery_lat && req.delivery_lng);
  const activeRequests = requestMarkers.length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-[#8C6614] mb-2">Chef map</p>
          <h1 className="text-3xl font-bold text-[#0B0B0B]">Nearby customer requests</h1>
          <p className="text-stone-500 mt-2 max-w-2xl">See current opportunities in your area and submit bids directly from the map.</p>
        </div>
        <button
          onClick={updateLocation}
          disabled={isSharingLocation}
          className="inline-flex items-center gap-2 rounded-3xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#0B0B0B] hover:bg-[#B38C26] transition"
        >
          <MapPin className="w-4 h-4" /> {isSharingLocation ? 'Sharing...' : 'Share live location'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr] mb-6">
        <div className="space-y-4">
          <div className="rounded-3xl border border-[#E7E2D8] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold text-stone-900">Status</h2>
                <p className="text-xs text-stone-400">Live location is only shared while available or on active jobs.</p>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{status.replace('_', ' ')}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-stone-50 p-4 border border-stone-100">
                <p className="text-xs text-stone-500">Your current requests</p>
                <p className="text-2xl font-bold text-stone-900">{activeRequests}</p>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4 border border-stone-100">
                <p className="text-xs text-stone-500">Verified</p>
                <p className="text-2xl font-bold text-stone-900">{chefProfile?.is_approved ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#E7E2D8] bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900 mb-4">Quick access</h2>
            <div className="grid gap-3">
              <button
                onClick={() => onNavigate('marketplace')}
                className="w-full rounded-2xl bg-orange-500 px-4 py-3 text-left text-white hover:bg-orange-600"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Browse market requests</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
                <p className="text-xs text-orange-100 mt-1">Jump to request details and submit bids.</p>
              </button>
              <button
                onClick={() => onNavigate('my-bids')}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-stone-900 hover:border-orange-200"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Manage your bids</span>
                  <ChevronRight className="w-4 h-4 text-stone-500" />
                </div>
                <p className="text-xs text-stone-500 mt-1">Keep your bid pipeline organized.</p>
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden border border-[#E7E2D8] shadow-sm">
          <MapContainer center={center} zoom={12} scrollWheelZoom style={{ minHeight: 620, width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyToLocation position={chefProfile?.current_lat && chefProfile?.current_lng ? [chefProfile.current_lat, chefProfile.current_lng] : center} />
            {requestMarkers.map(req => (
              <CircleMarker
                key={req.id}
                center={[req.delivery_lat!, req.delivery_lng!]}
                radius={10}
                pathOptions={{ color: '#0B0B0B', fillColor: '#0B0B0B', fillOpacity: 0.85 }}
              >
                <Popup>
                  <div className="space-y-2 text-sm text-stone-900">
                    <p className="font-semibold">{req.title}</p>
                    <p className="text-xs text-stone-500">{req.event_type.replace(/_/g, ' ')}</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                      <span className="rounded-full bg-stone-100 px-2 py-1">₦{req.budget_min.toLocaleString()} - ₦{req.budget_max.toLocaleString()}</span>
                      <span className="rounded-full bg-stone-100 px-2 py-1">{req.servings} guests</span>
                    </div>
                    <button
                      onClick={() => onNavigate('submit-bid', req)}
                      className="w-full rounded-2xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                    >
                      Submit Bid
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            {chefProfile?.current_lat && chefProfile?.current_lng && (
              <CircleMarker
                center={[chefProfile.current_lat, chefProfile.current_lng]}
                radius={8}
                pathOptions={{ color: '#D4AF37', fillColor: '#D4AF37', fillOpacity: 0.9 }}
              >
                <Popup>
                  <div className="text-sm text-stone-900">Your latest shared location</div>
                </Popup>
              </CircleMarker>
            )}
          </MapContainer>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
