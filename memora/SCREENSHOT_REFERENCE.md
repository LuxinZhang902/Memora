# Screenshot Reference Data

## Query Example: Driver License Renewal

### User Query
```
"When is the last time I renew my driver license?"
```

### System Flow (from terminal logs)

```
[STT] Processing file: renew_driver_liscence.mp3
[STT] ElevenLabs success! Text: When is the last time I renew my driver license?

[ExecuteQuery] Using hybrid search for: When is the last time I renew my driver license?

[ES] ========== HYBRID SEARCH STARTING ==========
[ES] Query text: When is the last time I renew my driver license?
[ES] Has query vector: true
[ES] DSL saved to: logs/hybrid-search-2025-10-10T21-53-28-176Z.json

[ES] ========== HYBRID SEARCH RESULTS ==========
[ES] Found: 0 moments, 1 files
[ES] *** TOP FILE MATCH ***
[ES] File name: my_note_driver_lisence.docx
[ES] Score: 0.79
[ES] Has extracted_text: true
[ES] Text preview: May.6 

Preparation for driver license

Old driver license
Proof of the current living address

[ES] *** RETURNING FILE-BASED RESULT ***
[ES] File content included: true
[ES] File name: my_note_driver_lisence.docx

[ComposeAnswer] ========== COMPOSING ANSWER ==========
[ComposeAnswer] Query: When is the last time I renew my driver license?
[ComposeAnswer] Has hit: true
[ComposeAnswer] File content available: true
[ComposeAnswer] *** FILE CONTENT FOUND ***
[ComposeAnswer] File name: my_note_driver_lisence.docx
[ComposeAnswer] Has extracted_text: true
[ComposeAnswer] Text preview: May.6 

Preparation for driver license

Old driver license
Proof of the current living address
```

### System Response
```
"I can't tell when you last renewed your driver license. The document mentions 
'Preparation for driver license' but does not specify a renewal date."
```

### Evidence
- **File:** my_note_driver_lisence.docx
- **Type:** application/vnd.openxmlformats-officedocument.wordprocessingml.document
- **Content:** 
  - May.6
  - Preparation for driver license
  - Old driver license
  - Proof of the current living address

## Key Demonstration Points

### 1. Semantic Understanding
- **Query:** "renew driver license"
- **Document:** "Preparation for driver license"
- **Match:** ✅ Found despite different wording
- **Score:** 0.79 (high relevance)

### 2. Hybrid Search Components
- **BM25 (Keyword):** Matched "driver license" terms
- **Vector (Semantic):** Understood "renew" ≈ "preparation"
- **Fuzzy Search:** Handled "lisence" typo in filename
- **Cross-Index:** Searched both moments and file contents

### 3. Content Extraction
- **Format:** DOCX (Word document)
- **Extraction:** Mammoth library
- **Status:** success
- **Vector Embedding:** Generated (768 dimensions, nomic-embed-text-v1.5)

### 4. Grounded Response
- AI cites the specific file: "my_note_driver_lisence.docx"
- Quotes relevant content: "Preparation for driver license"
- Acknowledges limitation: "does not specify a renewal date"
- Provides evidence in gallery for user verification

## Technical Details

### Query DSL
```json
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "When is the last time I renew my driver license?",
            "fields": ["extracted_text", "title^2", "file_name^1.5", "description^1.2"],
            "type": "best_fields",
            "fuzziness": "AUTO",
            "operator": "or"
          }
        }
      ],
      "should": [
        {
          "script_score": {
            "query": { "match_all": {} },
            "script": {
              "source": "cosineSimilarity(params.query_vector, 'content_vector') + 1.0",
              "params": { "query_vector": [768-dim embedding] }
            }
          }
        }
      ],
      "filter": [
        { "term": { "user_id": "user-fg44cbdi8" } },
        { "term": { "extraction_status": "success" } }
      ]
    }
  }
}
```

### Performance Metrics
- **STT:** 1860ms (ElevenLabs)
- **Query Planning:** 6792ms (DedalusLabs LLM)
- **Hybrid Search:** 2316ms (Elasticsearch)
- **Evidence Building:** 272ms (GCS signed URLs)
- **Answer Composition:** 2661ms (DedalusLabs LLM)
- **Total:** ~13.9 seconds

## Known Issues

### User ID Mismatch
- **Files uploaded with:** `user-fg44cbdi8` (authenticated user)
- **Search filtering by:** `u_demo` (DEMO_USER_ID env var)
- **Result:** 0 files found initially
- **Fix:** Set `DEMO_USER_ID=user-fg44cbdi8` in `.env.local`

### After Fix
- Search correctly finds 1 file
- Hybrid search returns file content
- AI composes grounded answer with citation

## Screenshot Details

The screenshot shows:
1. **Top Bar:** User profile (luxin.zhang92@outlook.com), Logout button
2. **Input Area:** 
   - 🎤 Speak button
   - 📤 Upload button
   - Text input: "When is the last time I renew my driver license?"
   - ✨ Ask button
   - 🎯 Build My Memory button
3. **Response Card:**
   - 💡 Icon
   - Answer text with file citation
   - Timestamp: 2025-10-10T21:38:26.731Z
4. **Evidence Gallery:**
   - 📎 Evidence Gallery (1 item)
   - Document preview: my_note_driver_lisence.docx
5. **Debug Panel:** Show Debug Panel checkbox (collapsed)

## Use Cases Demonstrated

1. **Natural Language Query:** User speaks/types conversationally
2. **Semantic Matching:** System understands intent despite word variations
3. **File Content Search:** Searches inside uploaded documents
4. **Grounded Answers:** AI cites specific sources
5. **Evidence Verification:** User can view source documents
6. **Privacy:** User-specific results (user_id filtering)

## Future Improvements

1. **Better Date Extraction:** Parse "May.6" as a date
2. **Contextual Understanding:** Infer "preparation" implies upcoming renewal
3. **Multi-document Synthesis:** Combine info from multiple files
4. **Temporal Reasoning:** Calculate "last time" from document dates
5. **Reranking:** Use dedicated reranker model for better ordering
