import requests
import sys
import json
from datetime import datetime

class RideNegotiatorAPITester:
    def __init__(self, base_url="https://c209782c-7af6-48cb-8fb1-058165399461.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ride_id = None
        self.created_negotiation_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            print(f"   Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2, default=str)}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error Response: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_create_ride(self):
        """Test creating a new ride request"""
        ride_data = {
            "rider_name": "John Doe",
            "rider_phone": "555-1234",
            "origin": "Downtown Mall",
            "destination": "Airport",
            "initial_price": 25.0
        }
        
        success, response = self.run_test("Create Ride Request", "POST", "api/rides", 200, ride_data)
        if success and 'ride_id' in response:
            self.created_ride_id = response['ride_id']
            print(f"   Created ride ID: {self.created_ride_id}")
            return success
        else:
            # If creation fails, try to get existing ride for testing
            print("   Create failed, trying to use existing ride...")
            success_get, rides_response = self.run_test("Get Existing Rides", "GET", "api/rides", 200)
            if success_get and 'rides' in rides_response and len(rides_response['rides']) > 0:
                self.created_ride_id = rides_response['rides'][0]['id']
                print(f"   Using existing ride ID: {self.created_ride_id}")
                return True
            return False

    def test_get_rides(self):
        """Test getting available rides"""
        return self.run_test("Get Available Rides", "GET", "api/rides", 200)

    def test_get_specific_ride(self):
        """Test getting a specific ride by ID"""
        if not self.created_ride_id:
            print("❌ No ride ID available for testing")
            return False
        
        return self.run_test("Get Specific Ride", "GET", f"api/rides/{self.created_ride_id}", 200)

    def test_create_negotiation(self):
        """Test starting a negotiation"""
        if not self.created_ride_id:
            print("❌ No ride ID available for testing")
            return False
            
        negotiation_data = {
            "ride_id": self.created_ride_id,
            "driver_name": "Alice Smith",
            "driver_phone": "555-5678",
            "offer_amount": 30.0,
            "message": "I can do this ride safely"
        }
        
        success, response = self.run_test("Create Negotiation", "POST", "api/negotiations", 200, negotiation_data)
        if success and 'negotiation_id' in response:
            self.created_negotiation_id = response['negotiation_id']
            print(f"   Created negotiation ID: {self.created_negotiation_id}")
        return success

    def test_get_negotiations(self):
        """Test getting negotiations for a ride"""
        if not self.created_ride_id:
            print("❌ No ride ID available for testing")
            return False
            
        return self.run_test("Get Negotiations", "GET", f"api/negotiations/{self.created_ride_id}", 200)

    def test_counter_offer(self):
        """Test making a counter offer"""
        if not self.created_negotiation_id:
            print("❌ No negotiation ID available for testing")
            return False
            
        counter_data = {
            "negotiation_id": self.created_negotiation_id,
            "from_user_name": "John Doe",
            "from_user_phone": "555-1234",
            "offer_amount": 27.0,
            "message": "How about $27?"
        }
        
        return self.run_test("Create Counter Offer", "POST", "api/negotiations/counter", 200, counter_data)

    def test_accept_negotiation(self):
        """Test accepting a negotiation"""
        if not self.created_ride_id or not self.created_negotiation_id:
            print("❌ No ride ID or negotiation ID available for testing")
            return False
            
        return self.run_test("Accept Negotiation", "POST", f"api/rides/{self.created_ride_id}/accept/{self.created_negotiation_id}", 200)

    def test_error_cases(self):
        """Test error handling"""
        print("\n🔍 Testing Error Cases...")
        
        # Test invalid ride ID
        success1, _ = self.run_test("Invalid Ride ID", "GET", "api/rides/invalid-id", 404)
        
        # Test negotiation for non-existent ride
        invalid_negotiation = {
            "ride_id": "invalid-ride-id",
            "driver_name": "Test Driver",
            "driver_phone": "555-0000",
            "offer_amount": 20.0
        }
        success2, _ = self.run_test("Negotiation for Invalid Ride", "POST", "api/negotiations", 404, invalid_negotiation)
        
        # Test counter offer for invalid negotiation
        invalid_counter = {
            "negotiation_id": "invalid-negotiation-id",
            "from_user_name": "Test User",
            "from_user_phone": "555-0000",
            "offer_amount": 25.0
        }
        success3, _ = self.run_test("Invalid Counter Offer", "POST", "api/negotiations/counter", 404, invalid_counter)
        
        return success1 and success2 and success3

def main():
    print("🚗 RideNegotiator API Testing Suite")
    print("=" * 50)
    
    tester = RideNegotiatorAPITester()
    
    # Run all tests in sequence
    test_results = []
    
    # Basic functionality tests
    test_results.append(tester.test_health_check())
    test_results.append(tester.test_create_ride())
    test_results.append(tester.test_get_rides())
    test_results.append(tester.test_get_specific_ride())
    test_results.append(tester.test_create_negotiation())
    test_results.append(tester.test_get_negotiations())
    test_results.append(tester.test_counter_offer())
    
    # Test another round of negotiations
    print("\n🔄 Testing Second Round of Negotiations...")
    counter_data2 = {
        "negotiation_id": tester.created_negotiation_id,
        "from_user_name": "Alice Smith",
        "from_user_phone": "555-5678", 
        "offer_amount": 28.0,
        "message": "Final offer: $28"
    }
    success, _ = tester.run_test("Second Counter Offer", "POST", "api/negotiations/counter", 200, counter_data2)
    test_results.append(success)
    
    # Test acceptance
    test_results.append(tester.test_accept_negotiation())
    
    # Test error cases
    test_results.append(tester.test_error_cases())
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())