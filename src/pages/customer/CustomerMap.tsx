import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { MapPin, Star, Shield, Search, Funnel } from 'lucide-react';
import { supabase, ChefProfile } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Props { onNavigate: (page: string, data?: unknown) => void; }

type ChefMapRow = ChefProfile & {
  profiles?: { full_name: string; avatar_url: string; is_verified: boolean; location: string };
};

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

export default function CustomerMap({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [chefs, setChefs] = useState<ChefMapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [center, setCenter] = useState<[number, number]>([6.5244, 3.3792]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [distanceFilter, setDistanceFilter] = useState(25);
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [availabilityOnly, setAvailabilityOnly] = useState(true);

  useEffect(() => {
    async function loadChefs() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('chef_profiles')
        .select('*, profiles!inner(full_name, avatar_url, is_verified, location)')
        .eq('is_approved', true)
        .neq('current_lat', null)
        .neq('current_lng', null)
        .order('updated_at', { ascending: false });
      if (err) {
        setError(err.message);
      } else if (data) {
        setChefs(data as ChefMapRow[]);
      }
      setLoading(false);
    }
    loadChefs();
  }, []);

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser.');
      return;
    }
    setError('');
    navigator.geolocation.getCurrentPosition(
      position => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        setCenter(coords);
      },
      err => setError(err.message || 'Unable to access location.'),
      { enableHighAccuracy: true }
    );
  }

  const cuisines = useMemo(() => Array.from(new Set(chefs.flatMap(chef => chef.specialties || []))), [chefs]);

  const filteredChefs = useMemo(() => {
    return chefs.filter(chef => {
      if (availabilityOnly && !chef.is_available) return false;
      if (ratingFilter > 0 && chef.avg_rating < ratingFilter) return false;
      if (cuisineFilter !== 'all' && !(chef.specialties || []).includes(cuisineFilter)) return false;
      if (userLocation && chef.current_lat && chef.current_lng) {
        const distance = calculateDistance(userLocation[0], userLocation[1], chef.current_lat, chef.current_lng);
        if (distance > distanceFilter) return false;
      }
      return true;
    });
  }, [chefs, availabilityOnly, ratingFilter, cuisineFilter, distanceFilter, userLocation]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-[#8C6614] mb-2">Live chef discovery</p>
            <h1 className="text-3xl font-bold text-[#0B0B0B]">Find chefs near you</h1>
            <p className="text-stone-500 mt-2 max-w-2xl">Browse verified chefs on a live map with ratings, availability, and premium service details.</p>
          </div>
          <button
            onClick={useCurrentLocation}
            className="inline-flex items-center gap-2 rounded-3xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#0B0B0B] hover:bg-[#B38C26] transition"
          >
            <MapPin className="w-4 h-4" /> Use my location
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr] mb-6">
        <div className="space-y-4">
          <div className="rounded-3xl border border-[#E7E2D8] bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900 mb-4">Filters</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Cuisine</label>
                <select
                  value={cuisineFilter}
                  onChange={e => setCuisineFilter(e.target.value)}
                  className="w-full rounded-2xl border border-stone-200 bg-[#FEFBF7] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  <option value="all">All cuisines</option>
                  {cuisines.map(cuisine => <option key={cuisine} value={cuisine}>{cuisine}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Rating</label>
                <select
                  value={ratingFilter}
                  onChange={e => setRatingFilter(parseFloat(e.target.value))}
                  className="w-full rounded-2xl border border-stone-200 bg-[#FEFBF7] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  <option value={0}>All ratings</option>
                  <option value={4}>4.0+</option>
                  <option value={4.5}>4.5+</option>
                  <option value={5}>5.0</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Distance ({distanceFilter} km)</label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={distanceFilter}
                  onChange={e => setDistanceFilter(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="availability"
                  type="checkbox"
                  checked={availabilityOnly}
                  onChange={e => setAvailabilityOnly(e.target.checked)}
                  className="accent-orange-500"
                />
                <label htmlFor="availability" className="text-sm text-stone-700">Only show available chefs</label>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#E7E2D8] bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900 mb-4">Featured chefs</h2>
            {loading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, index) => (
                  <div key={index} className="h-24 rounded-3xl bg-stone-100 animate-pulse" />
                ))}
              </div>
            ) : filteredChefs.length === 0 ? (
              <p className="text-sm text-stone-400">No chefs match the current filters yet.</p>
            ) : (
              <div className="space-y-3">
                {filteredChefs.slice(0, 5).map(chef => {
                  const distance = userLocation && chef.current_lat && chef.current_lng
                    ? calculateDistance(userLocation[0], userLocation[1], chef.current_lat, chef.current_lng)
                    : undefined;
                  return (
                    <button
                      key={chef.id}
                      onClick={() => chef.current_lat && chef.current_lng && setCenter([chef.current_lat, chef.current_lng])}
                      className="w-full rounded-3xl border border-stone-100 p-4 text-left hover:border-orange-200 hover:bg-stone-50 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-stone-900">{chef.profiles?.full_name}</p>
                          <p className="text-xs text-stone-500 mt-1">{chef.specialties?.slice(0, 3).join(', ')}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-stone-900">{chef.avg_rating.toFixed(1)} ⭐</div>
                          <div className="text-xs text-stone-400">{distance ? `${distance.toFixed(1)} km` : 'Location available'}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden border border-[#E7E2D8] shadow-sm">
          <MapContainer center={center} zoom={12} scrollWheelZoom style={{ minHeight: 620, width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyToLocation position={userLocation || center} />
            {filteredChefs.map(chef => chef.current_lat && chef.current_lng ? (
              <CircleMarker
                key={chef.id}
                center={[chef.current_lat, chef.current_lng]}
                radius={10}
                pathOptions={{ color: '#D4AF37', fillColor: '#D4AF37', fillOpacity: 0.85 }}
              >
                <Popup>
                  <div className="space-y-2 text-sm text-stone-800">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center text-base font-bold">
                        {chef.profiles?.full_name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p className="font-semibold">{chef.profiles?.full_name}</p>
                        <p className="text-xs text-stone-500">{chef.profiles?.location}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] text-stone-600">{chef.avg_rating.toFixed(1)} ⭐</span>
                      <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] text-stone-600">{chef.is_available ? 'Available' : 'Offline'}</span>
                    </div>
                    <p className="text-xs text-stone-500">{chef.specialties?.slice(0, 3).join(', ')}</p>
                    <button
                      onClick={() => onNavigate('profile')}
                      className="w-full rounded-2xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                    >
                      View Profile
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ) : null)}
            {userLocation && (
              <CircleMarker
                center={userLocation}
                radius={8}
                pathOptions={{ color: '#0B0B0B', fillColor: '#0B0B0B', fillOpacity: 0.75 }}
              >
                <Popup>
                  <div className="text-sm text-stone-800">Your current location</div>
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
