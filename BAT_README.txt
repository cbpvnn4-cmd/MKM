╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║              SANAD ELEVATORS - Quick Start Guide                   ║
║                   نظام السند للمصاعد                               ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────────────┐
│                      📋 Requirements                                │
└────────────────────────────────────────────────────────────────────┘

    1. Docker Desktop (must be running)
    2. Web Browser (Chrome, Edge, Firefox)
    3. 4GB RAM minimum

┌────────────────────────────────────────────────────────────────────┐
│                   🚀 How to Start (3 Steps)                        │
└────────────────────────────────────────────────────────────────────┘

    Step 1: Open Docker Desktop
    ─────────────────────────────
    • Make sure Docker Desktop is running

    Step 2: Start the System
    ────────────────────────────
    • Double-click: start_system.bat
    • Or use desktop shortcut: "نظام السند - تشغيل"

    Step 3: Open Browser
    ──────────────────────
    • URL: http://localhost
    • Or: http://localhost:3000

    Login Credentials:
    ────────────────────
    • Username: admin
    • Password: admin123

┌────────────────────────────────────────────────────────────────────┐
│                    🎮 Control Commands                              │
└────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────┐
    │  File                   │  Function                     │
    ├──────────────────────────────────────────────────────────┤
    │  start_system.bat        │  Start entire system         │
    │  stop_system.bat         │  Stop entire system          │
    │  restart_system.bat      │  Restart entire system       │
    │  status_system.bat       │  Check system status         │
    │  logs_system.bat         │  View system logs            │
    └──────────────────────────────────────────────────────────┘

    💡 Tip: Use start_system.bat and stop_system.bat
       for most operations

┌────────────────────────────────────────────────────────────────────┐
│                    🔗 System URLs                                  │
└────────────────────────────────────────────────────────────────────┘

    Main Application:
    • http://localhost
    • http://localhost:3000

    Backend API:
    • http://localhost:8000
    • Documentation: http://localhost:8000/docs

    Database (PostgreSQL):
    • Port: 5433
    • Access via pgAdmin or DBeaver

┌────────────────────────────────────────────────────────────────────┐
│                    ⚠️  Troubleshooting                             │
└────────────────────────────────────────────────────────────────────┘

    Problem: System not working after start
    ─────────────────────────────────────────
    Solution:
    1. Check Docker Desktop is running
    2. Run status_system.bat to see status
    3. Run restart_system.bat to restart

    Problem: Cannot login
    ────────────────────
    Solution:
    • Username: admin
    • Password: admin123

    Problem: Port already in use
    ────────────────────────────────
    Solution:
    • Run stop_system.bat first

┌────────────────────────────────────────────────────────────────────┐
│                    📞 Support & Help                               │
└────────────────────────────────────────────────────────────────────┘

    If you encounter issues:
    1. Run status_system.bat - shows service status
    2. Run logs_system.bat - shows logs and errors
    3. Restart: stop_system.bat then start_system.bat

┌────────────────────────────────────────────────────────────────────┐
│                    💡 Important Tips                               │
└────────────────────────────────────────────────────────────────────┘

    ✓ Always stop system before shutting down computer
    ✓ Use status_system.bat to check system health
    ✓ Don't close start_system.bat window during startup
    ✓ Wait for "Started Successfully" message before opening browser

┌────────────────────────────────────────────────────────────────────┐
│                    🔄 Create Desktop Shortcuts                      │
└────────────────────────────────────────────────────────────────────┘

    Double-click: create_shortcuts.bat

    This creates 4 desktop shortcuts:
    • Start System
    • Stop System
    • Restart System
    • System Status

╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║                   Ready to Start!                                  ║
║                                                                    ║
║         Start the system: start_system.bat                         ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
