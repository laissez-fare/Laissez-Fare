import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Label } from './components/ui/label';
import { Car, MapPin, DollarSign, MessageCircle, Check, Clock, Users } from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [activeTab, setActiveTab] = useState('rider');
  const [rides, setRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [negotiations, setNegotiations] = useState([]);
  const [rideForm, setRideForm] = useState({
    rider_name: '',
    rider_phone: '',
    origin: '',
    destination: '',
    initial_price: ''
  });
  const [negotiationForm, setNegotiationForm] = useState({
    driver_name: '',
    driver_phone: '',
    offer_amount: '',
    message: ''
  });
  const [counterForm, setCounterForm] = useState({
    from_user_name: '',
    from_user_phone: '',
    offer_amount: '',
    message: ''
  });

  // Fetch available rides
  const fetchRides = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/rides`);
      const data = await response.json();
      setRides(data.rides || []);
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  };

  // Fetch negotiations for a specific ride
  const fetchNegotiations = async (rideId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/negotiations/${rideId}`);
      const data = await response.json();
      setNegotiations(data.negotiations || []);
    } catch (error) {
      console.error('Error fetching negotiations:', error);
    }
  };

  // Create new ride request
  const createRide = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rideForm,
          initial_price: parseFloat(rideForm.initial_price)
        })
      });
      
      if (response.ok) {
        setRideForm({ rider_name: '', rider_phone: '', origin: '', destination: '', initial_price: '' });
        fetchRides();
        alert('Ride request posted successfully!');
      }
    } catch (error) {
      console.error('Error creating ride:', error);
    }
  };

  // Start negotiation
  const startNegotiation = async (rideId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/negotiations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ride_id: rideId,
          ...negotiationForm,
          offer_amount: parseFloat(negotiationForm.offer_amount)
        })
      });
      
      if (response.ok) {
        setNegotiationForm({ driver_name: '', driver_phone: '', offer_amount: '', message: '' });
        fetchRides();
        fetchNegotiations(rideId);
        alert('Negotiation started!');
      }
    } catch (error) {
      console.error('Error starting negotiation:', error);
    }
  };

  // Make counter offer
  const makeCounterOffer = async (negotiationId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/negotiations/counter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negotiation_id: negotiationId,
          ...counterForm,
          offer_amount: parseFloat(counterForm.offer_amount)
        })
      });
      
      if (response.ok) {
        setCounterForm({ from_user_name: '', from_user_phone: '', offer_amount: '', message: '' });
        fetchNegotiations(selectedRide.id);
        fetchRides();
        alert('Counter offer made!');
      }
    } catch (error) {
      console.error('Error making counter offer:', error);
    }
  };

  // Accept negotiation
  const acceptNegotiation = async (rideId, negotiationId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/rides/${rideId}/accept/${negotiationId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchRides();
        fetchNegotiations(rideId);
        alert('Ride agreement confirmed!');
        setSelectedRide(null);
      }
    } catch (error) {
      console.error('Error accepting negotiation:', error);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  useEffect(() => {
    if (selectedRide) {
      fetchNegotiations(selectedRide.id);
      const interval = setInterval(() => {
        fetchNegotiations(selectedRide.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedRide]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">RideNegotiator</h1>
              <p className="text-sm text-gray-600">Set your price, negotiate your ride</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="rider" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Need a Ride
            </TabsTrigger>
            <TabsTrigger value="driver" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Drive & Earn
            </TabsTrigger>
          </TabsList>

          {/* Rider Tab */}
          <TabsContent value="rider" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Request a Ride
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createRide} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rider_name">Your Name</Label>
                    <Input
                      id="rider_name"
                      placeholder="Enter your name"
                      value={rideForm.rider_name}
                      onChange={(e) => setRideForm({ ...rideForm, rider_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="rider_phone">Phone Number</Label>
                    <Input
                      id="rider_phone"
                      placeholder="Your phone number"
                      value={rideForm.rider_phone}
                      onChange={(e) => setRideForm({ ...rideForm, rider_phone: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="origin">Pickup Location</Label>
                    <Input
                      id="origin"
                      placeholder="Where should we pick you up?"
                      value={rideForm.origin}
                      onChange={(e) => setRideForm({ ...rideForm, origin: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="destination">Drop-off Location</Label>
                    <Input
                      id="destination"
                      placeholder="Where are you going?"
                      value={rideForm.destination}
                      onChange={(e) => setRideForm({ ...rideForm, destination: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="initial_price">Your Offer ($)</Label>
                    <Input
                      id="initial_price"
                      type="number"
                      step="0.01"
                      placeholder="How much will you pay?"
                      value={rideForm.initial_price}
                      onChange={(e) => setRideForm({ ...rideForm, initial_price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                      Post Ride Request
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Driver Tab */}
          <TabsContent value="driver" className="space-y-6">
            <div className="grid gap-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Available Rides
              </h2>
              
              {rides.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No rides available at the moment</p>
                  </CardContent>
                </Card>
              ) : (
                rides.map((ride) => (
                  <Card key={ride.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={ride.status === 'open' ? 'default' : 'secondary'}>
                              {ride.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {ride.rider_name}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-green-600" />
                              <span className="text-sm">From: {ride.origin}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-red-600" />
                              <span className="text-sm">To: {ride.destination}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="text-xl font-bold text-green-600">
                              ${ride.current_price || ride.initial_price}
                            </span>
                          </div>
                          {ride.status === 'agreed' ? (
                            <Badge variant="success" className="mt-2">
                              <Check className="h-3 w-3 mr-1" />
                              Agreed
                            </Badge>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  className="mt-2"
                                  onClick={() => setSelectedRide(ride)}
                                  variant={ride.status === 'negotiating' ? 'outline' : 'default'}
                                >
                                  {ride.status === 'negotiating' ? (
                                    <>
                                      <MessageCircle className="h-4 w-4 mr-1" />
                                      View Chat
                                    </>
                                  ) : (
                                    'Make Offer'
                                  )}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Negotiate: {ride.origin} → {ride.destination}</DialogTitle>
                                </DialogHeader>
                                
                                {/* Negotiation History */}
                                <div className="space-y-4 max-h-60 overflow-y-auto">
                                  <div className="bg-blue-50 p-3 rounded-lg">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium">{ride.rider_name} (Rider)</span>
                                      <span className="text-lg font-bold text-blue-600">${ride.initial_price}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">Initial ride request</p>
                                  </div>
                                  
                                  {negotiations.map((negotiation, index) => (
                                    <div key={negotiation.id} className={`p-3 rounded-lg ${
                                      negotiation.from_user_name === ride.rider_name 
                                        ? 'bg-blue-50 ml-8' 
                                        : 'bg-gray-50 mr-8'
                                    }`}>
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">
                                          {negotiation.from_user_name}
                                          {negotiation.from_user_name === ride.rider_name ? ' (Rider)' : ' (Driver)'}
                                        </span>
                                        <span className="text-lg font-bold text-green-600">
                                          ${negotiation.offer_amount}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1">{negotiation.message}</p>
                                      
                                      {/* Accept/Counter buttons */}
                                      {index === negotiations.length - 1 && !negotiation.is_accepted && (
                                        <div className="flex gap-2 mt-3">
                                          <Button
                                            size="sm"
                                            onClick={() => acceptNegotiation(ride.id, negotiation.id)}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            <Check className="h-3 w-3 mr-1" />
                                            Accept ${negotiation.offer_amount}
                                          </Button>
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <Button size="sm" variant="outline">
                                                Counter Offer
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                              <DialogHeader>
                                                <DialogTitle>Make Counter Offer</DialogTitle>
                                              </DialogHeader>
                                              <div className="space-y-4">
                                                <div>
                                                  <Label>Your Name</Label>
                                                  <Input
                                                    placeholder="Your name"
                                                    value={counterForm.from_user_name}
                                                    onChange={(e) => setCounterForm({ ...counterForm, from_user_name: e.target.value })}
                                                  />
                                                </div>
                                                <div>
                                                  <Label>Your Phone</Label>
                                                  <Input
                                                    placeholder="Your phone number"
                                                    value={counterForm.from_user_phone}
                                                    onChange={(e) => setCounterForm({ ...counterForm, from_user_phone: e.target.value })}
                                                  />
                                                </div>
                                                <div>
                                                  <Label>Your Counter Offer ($)</Label>
                                                  <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Your price"
                                                    value={counterForm.offer_amount}
                                                    onChange={(e) => setCounterForm({ ...counterForm, offer_amount: e.target.value })}
                                                  />
                                                </div>
                                                <div>
                                                  <Label>Message (Optional)</Label>
                                                  <Textarea
                                                    placeholder="Add a message..."
                                                    value={counterForm.message}
                                                    onChange={(e) => setCounterForm({ ...counterForm, message: e.target.value })}
                                                  />
                                                </div>
                                                <Button 
                                                  onClick={() => makeCounterOffer(negotiation.id)}
                                                  className="w-full"
                                                >
                                                  Send Counter Offer
                                                </Button>
                                              </div>
                                            </DialogContent>
                                          </Dialog>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {/* Start New Negotiation */}
                                {negotiations.length === 0 && (
                                  <div className="space-y-4 border-t pt-4">
                                    <h4 className="font-medium">Make Your Offer</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Your Name</Label>
                                        <Input
                                          placeholder="Your name"
                                          value={negotiationForm.driver_name}
                                          onChange={(e) => setNegotiationForm({ ...negotiationForm, driver_name: e.target.value })}
                                        />
                                      </div>
                                      <div>
                                        <Label>Your Phone</Label>
                                        <Input
                                          placeholder="Your phone number"
                                          value={negotiationForm.driver_phone}
                                          onChange={(e) => setNegotiationForm({ ...negotiationForm, driver_phone: e.target.value })}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label>Your Offer ($)</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Your price for this ride"
                                        value={negotiationForm.offer_amount}
                                        onChange={(e) => setNegotiationForm({ ...negotiationForm, offer_amount: e.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <Label>Message (Optional)</Label>
                                      <Textarea
                                        placeholder="Add a message to the rider..."
                                        value={negotiationForm.message}
                                        onChange={(e) => setNegotiationForm({ ...negotiationForm, message: e.target.value })}
                                      />
                                    </div>
                                    <Button 
                                      onClick={() => startNegotiation(ride.id)}
                                      className="w-full"
                                      disabled={!negotiationForm.driver_name || !negotiationForm.offer_amount}
                                    >
                                      Send Offer
                                    </Button>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;