
### **Phase 1: Accounts & Tooling (Step 0 - Today)**

- [x] Sign up for required free developer accounts.
    
- [x] Install local developer software on your computer.
    

### **Phase 2: Database Setup (Supabase)**

- [x] Create a new Supabase project.
    
- [ ] Enable the `PostGIS` geospatial extension.
    
- [ ] Create the database tables (`intersections`, `vehicle_counts`, etc.).
    
- [ ] Insert mock test data for intersections and helmet checkpoints.
    

### **Phase 3: Backend Setup (Node.js/Express API)**

- [ ] Initialize a basic Node.js server project.
    
- [ ] Connect Node.js to your Supabase database.
    
- [ ] Build initial route placeholders (`/vehicles`, `/predictions`, `/routes`, `/checkpoints`).
    
- [ ] Build the `/vehicles/ingest` endpoint so Person A can send vehicle counts to your database.
    

### **Phase 4: Frontend Dashboard (React + Mapbox)**

- [ ] Create a new React project with Vite.
    
- [ ] Install Mapbox GL and Tailwind CSS.
    
- [ ] Render a blank, interactive map centered on your target city grid.
    
- [ ] Add visual markers on the map for intersections and active police checkpoints.
    

### **Phase 5: Logic, Routing & Optimization**

- [ ] Implement the signal timing recommendation logic (calculate green-light split).
    
- [ ] Implement alternate route calculation using map data.
    
- [ ] Add the **"Forgot your helmet?"** toggle UI feature to bypass active checkpoints.
    
- [ ] Display statistics (time saved, emissions reduced).
    

### **Phase 6: Integration, Polish & Deploy**

- [ ] Hook up Person A's live FastAPI inference service (`/predict`).
    
- [ ] Host backend on Render and frontend on Vercel.
    
- [ ] Test end-to-end and polish the UI for submission.