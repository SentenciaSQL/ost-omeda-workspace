````
WHAT TO SHIP TO THE REAL MONOREPO (copy these files):

   1. permissions.constants.ts  → add 1 line to existing file
   2. chatbot-loader.service.ts → new file (adjust imports) 
   3. audience-builder logic    → integrate into query.component
    - Template: the @if + container div (Task 2)
    - TS: setupStateBridge(), setupEventListeners(),
           handleApplySkittlePlan(), mapToChatbotState(),
           transformToOmedaFormat()
   4. chatbot-contracts.model.ts → new file (shared types)
   5. environment config → add chatbotBundleUrl to existing env files

Total real-repo changes: ~150 lines across 3-4 files ✅
````
