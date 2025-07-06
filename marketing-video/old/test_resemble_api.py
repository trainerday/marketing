#!/usr/bin/env python3
"""
Test script to verify Resemble.ai API access and endpoints.
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

def test_resemble_api():
    api_key = os.getenv('RESEMBLE_API_KEY')
    voice_id = "cfc7c011"
    
    print(f"API Key: {api_key}")
    print(f"Voice ID: {voice_id}")
    
    # Test different endpoints
    endpoints_to_test = [
        'https://app.resemble.ai/api/v1',
        'https://app.resemble.ai/api/v2', 
        'https://f.cluster.resemble.ai'
    ]
    
    headers = {
        'Authorization': f'Token token={api_key}',
        'Content-Type': 'application/json'
    }
    
    for base_url in endpoints_to_test:
        print(f"\nTesting endpoint: {base_url}")
        
        # Try to list voices or get account info
        test_urls = [
            f"{base_url}/voices",
            f"{base_url}/projects", 
            f"{base_url}/clips"
        ]
        
        for url in test_urls:
            try:
                response = requests.get(url, headers=headers, timeout=10)
                print(f"  GET {url}: {response.status_code}")
                if response.status_code == 200:
                    print(f"    Success! Content type: {response.headers.get('content-type')}")
                elif response.status_code == 404:
                    print(f"    404 - Endpoint not found")
                elif response.status_code == 401:
                    print(f"    401 - Unauthorized (check API key)")
                elif response.status_code == 403:
                    print(f"    403 - Forbidden (check permissions)")
                else:
                    print(f"    Response: {response.text[:100]}...")
            except Exception as e:
                print(f"  Error testing {url}: {e}")

if __name__ == "__main__":
    test_resemble_api()