"""
Phase 4 Verification Script: Test Semantic Retrieval API and Privacy Rules.
"""
import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("=" * 60)
    print("PHASE 4: TESTING BACKEND SEMANTIC RETRIEVAL & PRIVACY RULES")
    print("=" * 60)

    # -------------------------------------------------------------
    # TEST 1: Unauthenticated access & 3 natural-language queries
    # -------------------------------------------------------------
    test_queries = [
        ("function throttling and limiting event frequency", "Debounce Function"),
        ("divide and conquer recursive sorting", "Merge Sort"),
        ("making HTTP GET request and handling promise", "Fetch with Async/Await"),
    ]

    print("\n--- Test 1-4: Natural Language Queries & Relevance & Scores (Unauthenticated) ---")
    for q, expected_title in test_queries:
        res = requests.get(f"{BASE_URL}/snippets/semantic-search", params={"q": q, "top_k": 5})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "snippets" in data, "Response missing 'snippets' field"
        snippets = data["snippets"]
        assert len(snippets) > 0, f"Expected matches for '{q}', got 0"
        
        # Verify score presence and range
        for s in snippets:
            assert "similarity_score" in s, f"Snippet missing similarity_score: {s}"
            assert 0.0 <= s["similarity_score"] <= 1.0, f"Score out of range: {s['similarity_score']}"
            assert "id" in s and "title" in s and "code" in s, f"Missing snippet metadata: {s}"
            assert "embedding" not in s, "Embedding vector must NOT be exposed!"

        top_match = snippets[0]
        print(f"Query: '{q}'")
        print(f"  -> Top match: '{top_match['title']}' (Score: {top_match['similarity_score']})")
        assert top_match["title"] == expected_title, f"Expected top match '{expected_title}', got '{top_match['title']}'"

    print("✅ Tests 1-4 passed: 3 natural language queries returned semantically relevant snippets with valid similarity scores.")

    # -------------------------------------------------------------
    # TEST 5 & 6: Authenticated Access vs Unauthenticated Access
    # -------------------------------------------------------------
    print("\n--- Test 5-7: User Signup, Authenticated Access & Private Snippet Privacy Rules ---")
    
    # 1. Sign up User A
    user_a_email = "test_user_a@dailycode.local"
    user_b_email = "test_user_b@dailycode.local"
    password = "TestPassword123!"

    # Signup / login User A
    requests.post(f"{BASE_URL}/auth/signup", json={"email": user_a_email, "password": password})
    login_a_res = requests.post(f"{BASE_URL}/auth/login", data={"username": user_a_email, "password": password})
    assert login_a_res.status_code == 200, f"Login A failed: {login_a_res.text}"
    token_a = login_a_res.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Signup / login User B
    requests.post(f"{BASE_URL}/auth/signup", json={"email": user_b_email, "password": password})
    login_b_res = requests.post(f"{BASE_URL}/auth/login", data={"username": user_b_email, "password": password})
    assert login_b_res.status_code == 200, f"Login B failed: {login_b_res.text}"
    token_b = login_b_res.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Authenticated semantic search works
    auth_search_res = requests.get(f"{BASE_URL}/snippets/semantic-search", params={"q": "debounce"}, headers=headers_a)
    assert auth_search_res.status_code == 200, "Authenticated search failed"
    print("✅ Authenticated access verified for User A.")

    # 2. User A creates a PRIVATE snippet with unique terminology
    private_snippet_payload = {
        "title": "Confidential Quantum Key Distribution Protocol",
        "language": "Python",
        "code": "def bb84_qkd_exchange(qubits):\n    return 'secret-quantum-key'",
        "explanation": "Quantum cryptographic key distribution exchange protocol implementing BB84.",
        "difficulty": "advanced",
        "category": "algorithm",
        "is_public": False,
        "tags": ["quantum", "cryptography", "private-protocol"]
    }
    add_res = requests.post(f"{BASE_URL}/snippets/add", json=private_snippet_payload, headers=headers_a)
    assert add_res.status_code == 200, f"Failed to add private snippet: {add_res.text}"
    private_snippet_id = add_res.json()["id"]
    print(f"Created private snippet ID {private_snippet_id} owned by User A.")

    # -------------------------------------------------------------
    # TEST 7: Privacy Rules
    # -------------------------------------------------------------
    q_private = "quantum cryptographic key distribution exchange"

    # Query 1: Unauthenticated guest MUST NOT see User A's private snippet
    guest_res = requests.get(f"{BASE_URL}/snippets/semantic-search", params={"q": q_private, "top_k": 5})
    assert guest_res.status_code == 200
    guest_snippet_ids = [s["id"] for s in guest_res.json()["snippets"]]
    print(f"Guest search snippet IDs: {guest_snippet_ids}")
    assert private_snippet_id not in guest_snippet_ids, "PRIVACY VIOLATION: Guest can see User A's private snippet!"
    print("✅ Guest CANNOT see User A's private snippet.")

    # Query 2: User B MUST NOT see User A's private snippet
    user_b_res = requests.get(f"{BASE_URL}/snippets/semantic-search", params={"q": q_private, "top_k": 5}, headers=headers_b)
    assert user_b_res.status_code == 200
    user_b_snippet_ids = [s["id"] for s in user_b_res.json()["snippets"]]
    print(f"User B search snippet IDs: {user_b_snippet_ids}")
    assert private_snippet_id not in user_b_snippet_ids, "PRIVACY VIOLATION: User B can see User A's private snippet!"
    print("✅ User B CANNOT see User A's private snippet.")

    # Query 3: User A (Owner) MUST see their own private snippet!
    user_a_res = requests.get(f"{BASE_URL}/snippets/semantic-search", params={"q": q_private, "top_k": 5}, headers=headers_a)
    assert user_a_res.status_code == 200
    user_a_snippets = user_a_res.json()["snippets"]
    user_a_snippet_ids = [s["id"] for s in user_a_snippets]
    print(f"User A search snippet IDs: {user_a_snippet_ids}")
    assert private_snippet_id in user_a_snippet_ids, "User A cannot see their own private snippet!"
    owner_match = next(s for s in user_a_snippets if s["id"] == private_snippet_id)
    print(f"✅ User A (owner) retrieved their own private snippet: '{owner_match['title']}' (Score: {owner_match['similarity_score']})")

    # -------------------------------------------------------------
    # TEST 8: No-results behavior
    # -------------------------------------------------------------
    print("\n--- Test 8: No-Results / Edge Cases ---")
    
    # 8a: Query that fails minimum similarity or empty string
    empty_res = requests.get(f"{BASE_URL}/snippets/semantic-search", params={"q": ""})
    assert empty_res.status_code == 422, f"Expected 422 for empty query, got {empty_res.status_code}"
    print("✅ Empty query returns 422 validation error as expected.")

    # 8b: High top_k boundary validation
    invalid_top_k = requests.get(f"{BASE_URL}/snippets/semantic-search", params={"q": "search", "top_k": 50})
    assert invalid_top_k.status_code == 422, f"Expected 422 for top_k > 20, got {invalid_top_k.status_code}"
    print("✅ top_k > 20 returns 422 validation error as expected.")

    print("\n" + "=" * 60)
    print("ALL PHASE 4 TESTS PASSED SUCCESSFULLY! 🚀")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
