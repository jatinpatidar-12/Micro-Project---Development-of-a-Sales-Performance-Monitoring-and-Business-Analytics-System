SALES PERFORMANCE MONITORING & BUSINESS ANALYTICS SYSTEM

HOW TO RUN
1. Extract the ZIP folder.
2. Open the folder in Visual Studio Code.
3. Install the "Live Server" extension (or use any local static web server).
4. Right-click index.html and choose "Open with Live Server".
5. Click Upload data and select sample-sales.csv to test the system.

FEATURES
- Import CSV and JSON sales records.
- Data validation before import.
- Persistent browser storage using IndexedDB.
- Revenue, units sold, order count and average order value.
- Revenue trend and product revenue charts.
- Search and date filters.
- Delete an individual record or delete all records.
- Export filtered records as CSV.

CSV FORMAT
Required columns: date, product, customer, quantity, unit_price
Example:
date,product,customer,quantity,unit_price
2026-11-01,Laptop,Arjun,2,55000

IMPORTANT BACKEND NOTE
This project intentionally uses only HTML, CSS and JavaScript. IndexedDB is a
browser-side database, so records persist in the same browser profile on the
same device. This is a working local data layer, not a remote server backend.
It does not provide user accounts, multi-device sync or shared access. A true
server backend requires a server runtime/database (for example Java + MySQL,
Node.js + SQLite, or PHP + MySQL).

Chart.js is loaded from a CDN, so an internet connection is needed for charts.
The data import, storage, filtering, deletion and CSV export work in the browser.
