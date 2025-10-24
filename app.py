from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash, send_from_directory
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
from datetime import datetime
import re

app = Flask(__name__)
app.secret_key = "supersecretkey"
DB_NAME = "users.db"

# ===== Food Prices =====
FOOD_PRICES = {
    "Tapsilog": 120,
    "Longsilog": 80,
    "Maling silog": 50,
    "Hotsilog": 60,
    "Silog": 60,
    "Bangus silog": 90,
    "Porksilog": 70
}

# ===== MENU =====
MENU_ITEMS = [
    ('001', 'Tapsilog', 'Rice Meal'),
    ('002', 'Longsilog', 'Rice Meal'),
    ('003', 'Maling silog', 'Rice Meal'),
    ('004', 'Hotsilog', 'Rice Meal'),
    ('005', 'Silog', 'Rice Meal'),
    ('006', 'Bangus silog', 'Rice Meal'),
    ('007', 'Porksilog', 'Rice Meal')
]

def init_db():
    create_new_db = not os.path.exists(DB_NAME)
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # ===== Users table =====
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        is_admin INTEGER DEFAULT 0,
        is_staff INTEGER DEFAULT 0,
        created_at TEXT
    )""")

    # ===== Order Notifications table =====
    c.execute("""CREATE TABLE IF NOT EXISTS order_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        user_id INTEGER,
        message TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT,
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )""")

    # ===== Add created_at column if it doesn't exist =====
    columns = [row["name"] for row in c.execute("PRAGMA table_info(users)")]
    if "created_at" not in columns:
        c.execute("ALTER TABLE users ADD COLUMN created_at TEXT")
    if "last_login" not in columns:
        c.execute("ALTER TABLE users ADD COLUMN last_login TEXT")
    if "last_logout" not in columns:
        c.execute("ALTER TABLE users ADD COLUMN last_logout TEXT")
    if "is_banned" not in columns:
        c.execute("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0")
    if "is_online" not in columns:
        c.execute("ALTER TABLE users ADD COLUMN is_online INTEGER DEFAULT 0")

    # ===== Orders table =====
    c.execute("""CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        cust_name TEXT,
        cust_contact TEXT,
        order_date TEXT,
        food TEXT,
        category TEXT,
        quantity INTEGER,
        payment_status TEXT DEFAULT 'Pending',
        price REAL,
        image_path TEXT,
        status TEXT DEFAULT 'Available',
        tracker TEXT,
        served_date TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )""")

    # ===== Rejected Orders table =====
    c.execute("""CREATE TABLE IF NOT EXISTS rejected_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_order_id INTEGER,
        user_id INTEGER,
        cust_name TEXT,
        cust_contact TEXT,
        order_date TEXT,
        food TEXT,
        quantity INTEGER,
        price REAL,
        image_path TEXT,
        rejected_by TEXT,
        rejected_at TEXT,
        reason TEXT DEFAULT 'No reason provided',
        FOREIGN KEY(user_id) REFERENCES users(id)
    )""")

    # ===== Ensure required columns exist in orders =====
    columns = [row["name"] for row in c.execute("PRAGMA table_info(orders)")]
    required_columns = ['image_path', 'tracker', 'served_date']
    for col in required_columns:
        if col not in columns:
            c.execute(f"ALTER TABLE orders ADD COLUMN {col} TEXT")

    # ===== Menu Status table =====
    c.execute("""CREATE TABLE IF NOT EXISTS menu_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'Available'
    )""")
    
    # ===== Food Stock table =====
    c.execute("""CREATE TABLE IF NOT EXISTS food_stock (
        food_name TEXT PRIMARY KEY,
        stock INTEGER
    )""")
    
    # ===== Insert default stock =====
    default_stock = [
        ('Tapsilog', 40),
        ('Longsilog', 30),
        ('Maling silog', 25),
        ('Hotsilog', 20),
        ('Silog', 35),
        ('Bangus silog', 15),
        ('Porksilog', 28)
    ]
    for food_name, stock in default_stock:
        c.execute("INSERT OR IGNORE INTO food_stock (food_name, stock) VALUES (?, ?)", (food_name, stock))
    
    # ===== Ratings table =====
    c.execute("""CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food TEXT NOT NULL,
        rating INTEGER NOT NULL,
        username TEXT NOT NULL
    )""")
    
    # ===== Global comments table =====
    c.execute("""CREATE TABLE IF NOT EXISTS global_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        comment TEXT NOT NULL
    )""")

    # ===== Ingredients table =====
    c.execute("""CREATE TABLE IF NOT EXISTS ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        current_stock INTEGER NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT 'pcs'
    )""")

    # ===== Insert default ingredients =====
    default_ingredients = [
        ('Pork', 50, 'packed in plastic'),
        ('Hotdog', 3, 'packs'),
        ('Chicken', 50, 'packed in plastic'),
        ('Maling', 10, 'cans'),
        ('Tapa', 40, 'packed in plastic'),
        ('Longganisa', 3, 'dozens'),
        ('Bangus', 15, 'pieces'),
        ('Egg', 3, 'trays'),
        ('Rice', 3, 'sack'),
        ('Garlic', 3, 'kilogram'),
        ('Oil', 3, 'gallon'),
        ('Ketchup', 3, 'gallon')
    ]
    for name, stock, unit in default_ingredients:
        c.execute("INSERT OR IGNORE INTO ingredients (name, current_stock, unit) VALUES (?, ?, ?)", (name, stock, unit))
    
    # ===== Insert default menu items =====
    for food in FOOD_PRICES.keys():
        c.execute("INSERT OR IGNORE INTO menu_status (food, status) VALUES (?, ?)", (food, 'Available'))
    
    created_at = datetime.now().strftime("%b %d, %Y - %I:%M %p")
    c.execute(
        "INSERT OR IGNORE INTO users (username, password, is_admin, created_at) VALUES (?, ?, ?, ?)",
        ("admin", generate_password_hash("admin12345"), 1, created_at)
    )
    
    conn.commit()
    conn.close()



# Initialize DB first
init_db()

def deduct_ingredients_for_food(food_name, quantity):
    """
    Deduct ingredients from inventory when food stock is added
    Uses proper unit capacities as specified
    Returns: (success, message)
    """
    # Recipe definitions with actual unit consumption
    RECIPES = {
        "Tapsilog": {"Tapa": 1, "Rice": 1, "Egg": 1, "Garlic": 1, "Oil": 1},
        "Longsilog": {"Longganisa": 1, "Rice": 1, "Egg": 1, "Garlic": 1, "Oil": 1},
        "Maling silog": {"Maling": 1, "Rice": 1, "Egg": 1, "Garlic": 1, "Oil": 1},
        "Hotsilog": {"Hotdog": 1, "Rice": 1, "Egg": 1, "Garlic": 1, "Oil": 1},
        "Silog": {"Rice": 1, "Egg": 1, "Garlic": 1, "Oil": 1},
        "Bangus silog": {"Bangus": 1, "Rice": 1, "Egg": 1, "Garlic": 1, "Oil": 1},
        "Porksilog": {"Pork": 1, "Rice": 1, "Egg": 1, "Garlic": 1, "Oil": 1}
    }
    
    # Unit capacities - how many servings per unit
    UNIT_CAPACITIES = {
        "Oil": 25,        # 1 gallon = 25 servings
        "Rice": 100,      # 1 sack = 100 servings
        "Maling": 6,      # 1 can = 6 servings
        "Garlic": 150,    # 1kg = 150 servings
        "Egg": 25,        # 1 tray = 25 servings
        "Hotdog": 5,      # 1 pack = 5 servings
        "Longganisa": 6,  # 1 dozen = 6 servings
        "Pork": 1,        # 1 packed = 1 serving
        "Chicken": 1,     # 1 packed = 1 serving
        "Tapa": 1,        # 1 packed = 1 serving
        "Bangus": 1       # 1 piece = 1 serving
    }
    
    conn = get_db_connection()
    
    try:
        # Start transaction
        conn.execute("BEGIN TRANSACTION")
        
        if food_name not in RECIPES:
            return False, f"No recipe found for {food_name}"
        
        recipe = RECIPES[food_name]
        deducted_ingredients = []
        insufficient_ingredients = []
        
        # Check if we have enough of each ingredient
        for ingredient, servings_needed in recipe.items():
            if ingredient not in UNIT_CAPACITIES:
                insufficient_ingredients.append(f"{ingredient} (no unit capacity defined)")
                continue
                
            # Calculate how many units we need to consume
            capacity = UNIT_CAPACITIES[ingredient]
            units_needed = servings_needed * quantity / capacity
            
            # For items that can't be partially used, round up
            if capacity == 1:  # Single serving items
                units_needed = servings_needed * quantity
            else:
                # For bulk items, we need to check if we have enough total servings
                units_needed = servings_needed * quantity
            
            # Get current stock (in units)
            current = conn.execute(
                "SELECT current_stock, unit FROM ingredients WHERE name = ?", 
                (ingredient,)
            ).fetchone()
            
            if not current:
                insufficient_ingredients.append(f"{ingredient} (not in inventory)")
                continue
            
            current_units = current['current_stock']
            current_servings = current_units * capacity
            
            # Check if we have enough servings
            if current_servings < units_needed:
                missing_servings = units_needed - current_servings
                missing_units = missing_servings / capacity
                insufficient_ingredients.append(
                    f"{ingredient} (need {units_needed:.1f} servings, have {current_servings:.1f})"
                )
        
        # If any ingredients are insufficient, abort
        if insufficient_ingredients:
            return False, f"Insufficient ingredients: {', '.join(insufficient_ingredients)}"
        
        # Deduct all ingredients (in units)
        for ingredient, servings_needed in recipe.items():
            capacity = UNIT_CAPACITIES[ingredient]
            
            if capacity == 1:  # Single serving items
                units_to_deduct = servings_needed * quantity
            else:
                # For bulk items, calculate fractional units
                servings_to_deduct = servings_needed * quantity
                units_to_deduct = servings_to_deduct / capacity
            
            # Update ingredient stock (in units)
            conn.execute(
                "UPDATE ingredients SET current_stock = current_stock - ? WHERE name = ?",
                (units_to_deduct, ingredient)
            )
            
            # Format display message
            if capacity == 1:
                deducted_ingredients.append(f"{units_to_deduct:.0f} {ingredient}")
            else:
                deducted_ingredients.append(f"{units_to_deduct:.2f} {ingredient}")
        
        # Commit transaction
        conn.commit()
        
        success_message = f"Deducted ingredients for {quantity} {food_name}: {', '.join(deducted_ingredients)}"
        return True, success_message
        
    except Exception as e:
        conn.rollback()
        return False, f"Error deducting ingredients: {str(e)}"
    finally:
        conn.close()

# --- Load stock from DB ---
def get_food_stock():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT food_name, stock FROM food_stock")
    stock_data = dict(cursor.fetchall())
    conn.close()
    return stock_data

# --- Update stock in DB ---
def update_food_stock(food_name, new_stock):
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("UPDATE food_stock SET stock = ? WHERE food_name = ?", (new_stock, food_name))
    conn.commit()
    conn.close()

@app.route("/admin", methods=["GET"])
def admin():
    stock = get_food_stock()
    return render_template("admin.html", food_prices=FOOD_PRICES, food_stock=stock)

@app.route("/update_stock", methods=["POST"])
def update_stock():
    if not session.get('is_admin') and not session.get('is_staff'):
        return redirect(url_for('auth'))

    food_name = request.form.get("food_name")
    new_stock = request.form.get("new_stock")

    if not food_name or not new_stock:
        flash("❌ Missing food name or stock value", "error")
        return redirect(url_for("inventory"))

    try:
        new_stock = int(new_stock)
        if new_stock < 0:
            flash("❌ Stock cannot be negative", "error")
            return redirect(url_for("inventory"))

        conn = get_db_connection()
        
        # Get current stock to calculate how much we're adding
        current_row = conn.execute(
            "SELECT stock FROM food_stock WHERE food_name = ?", 
            (food_name,)
        ).fetchone()
        
        current_stock = current_row['stock'] if current_row else 0
        stock_to_add = new_stock - current_stock
        
        # Only deduct ingredients if we're ADDING stock (not setting to a lower value)
        if stock_to_add > 0:
            # Deduct ingredients for the added stock
            success, message = deduct_ingredients_for_food(food_name, stock_to_add)
            
            if not success:
                flash(f"❌ {message}", "error")
                conn.close()
                return redirect(url_for("inventory"))
            
            # If ingredient deduction successful, update food stock
            flash(f"✅ {message}", "success")
        
        # Update the food stock in the database
        conn.execute(
            "UPDATE food_stock SET stock = ? WHERE food_name = ?", 
            (new_stock, food_name)
        )
        
        # 🆕 NEW: AUTO-UPDATE MENU STATUS BASED ON STOCK
        if new_stock == 0:
            # If stock is 0, automatically set status to "Not Available"
            conn.execute(
                "UPDATE menu_status SET status = ? WHERE food = ?",
                ("Not Available", food_name)
            )
            flash(f"🔄 {food_name} status automatically set to 'Not Available' (stock reached 0)", "info")
        elif new_stock > 0:
            # If stock becomes available again, you might want to auto-set to "Available"
            # Or leave it as-is (staff can manually enable)
            # Uncomment below if you want auto-enable when stock > 0:
            # conn.execute(
            #     "UPDATE menu_status SET status = ? WHERE food = ?",
            #     ("Available", food_name)
            # )
            # flash(f"🔄 {food_name} status automatically set to 'Available' (stock replenished)", "info")
            pass
        
        conn.commit()
        conn.close()
        
        if stock_to_add <= 0:
            flash(f"✅ {food_name} stock updated to {new_stock}", "success")
        
        return redirect(url_for("inventory"))
        
    except ValueError:
        flash("❌ Invalid stock value", "error")
        return redirect(url_for("inventory"))
    except Exception as e:
        flash(f"❌ Error: {str(e)}", "error")
        return redirect(url_for("inventory"))

# ===== Create 5 Staff Accounts =====
def create_staff_accounts():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    staff_users = [
        ("staff1", "staffpass1"),
        ("staff2", "staffpass2"),
        ("staff3", "staffpass3"),
        ("staff4", "staffpass4"),
        ("staff5", "staffpass5")
    ]

    for username, pwd in staff_users:
        c.execute("SELECT * FROM users WHERE username=?", (username,))
        if not c.fetchone():
            created_at = datetime.now().strftime("%b %d, %Y - %I:%M %p")
            c.execute(
                "INSERT INTO users (username, password, is_admin, is_staff, created_at) VALUES (?, ?, ?, ?, ?)",
                (username, generate_password_hash(pwd), 0, 1, created_at)
            )
    
    conn.commit()
    conn.close()

create_staff_accounts()

# ===== Helper Function =====
def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

# ===== Routes =====
@app.route('/')
def index():
    if "user_id" in session:
        return redirect(url_for('home'))
    return redirect(url_for('auth'))

# ===== Public Landing Page =====
@app.route('/home')
def home():
    # You can render the same auth.html or a separate landing page if you want
    return render_template('auth.html')

@app.route("/rate", methods=["POST"])
def rate_food():
    if "user_id" not in session:
        return jsonify({"success": False, "error": "Not logged in"})

    data = request.get_json()
    food = data["food"]
    stars = data["rating"]
    user_id = session["user_id"]
    username = session.get("username")

    con = sqlite3.connect(DB_NAME)
    cur = con.cursor()

    # ✅ Count how many times this user ordered the food
    cur.execute("SELECT SUM(quantity) FROM orders WHERE user_id=? AND food=?", (user_id, food))
    total_orders = cur.fetchone()[0] or 0

    # ✅ Count how many times this user already rated the food
    cur.execute("SELECT COUNT(*) FROM ratings WHERE food=? AND username=?", (food, username))
    total_ratings = cur.fetchone()[0]

    # Allow rating only if they have unrated orders left
    if total_ratings >= total_orders:
        con.close()
        return jsonify({"success": False, "error": "Already rated"})

    # ✅ Insert rating
    cur.execute(
        "INSERT INTO ratings (food, rating, username) VALUES (?, ?, ?)",
        (food, stars, username)
    )
    con.commit()
    con.close()
    return jsonify({"success": True})

@app.route('/can_rate', methods=['POST'])
def can_rate():
    if 'user_id' not in session:
        return jsonify({"allowed": False})

    data = request.get_json()
    food = data.get("food")
    user_id = session['user_id']
    username = session.get("username")

    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()

    # ✅ Total orders for this food
    cursor.execute("SELECT SUM(quantity) FROM orders WHERE user_id=? AND food=?", (user_id, food))
    total_orders = cursor.fetchone()[0] or 0

    # ✅ Total ratings given for this food
    cursor.execute("SELECT COUNT(*) FROM ratings WHERE food=? AND username=?", (food, username))
    total_ratings = cursor.fetchone()[0]

    conn.close()
    # Allowed if they have more orders than ratings
    return jsonify({"allowed": total_orders > total_ratings})

@app.route("/get_ratings")
def get_ratings():
    con = sqlite3.connect(DB_NAME)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute("SELECT food, rating, username FROM ratings")
    ratings = cur.fetchall()
    con.close()
    return jsonify([dict(r) for r in ratings])

# Fetch ratings & comments
@app.route('/food_data')
def get_food_data():
    data = {}
    with sqlite3.connect(DB_NAME) as con:
        con.row_factory = sqlite3.Row

        # Ratings
        for row in con.execute("SELECT food, AVG(rating) as avg_rating FROM ratings GROUP BY food"):
            data[row['food']] = {'avg_rating': row['avg_rating']}

    return jsonify(data)

# ===== Profanity Filter =====
PROFANITY_LIST = [
    # English profanity
    'shit', 'fuck', 'asshole', 'bitch', 'damn', 'hell', 'dick', 'pussy', 'cock', 
    'whore', 'slut', 'bastard', 'motherfucker', 'cunt', 'faggot', 'nigger',
    # Filipino profanity
    'putang', 'puta', 'gago', 'tangina', 'ulol', 'bobo', 'tarantado', 'punyeta', 
    'leche', 'bulok', 'siraulo', 'hayop', 'animal', 'lintik', 'shet', 'pakshet',
    'gagu', 'bwisit', 'pakyu', 'pota', 'potang', 'tanga', 'engot', 'sira'
]

def contains_profanity(text):
    """Check if text contains profanity"""
    text_lower = text.lower()
    # Check for exact word matches and partial matches
    for word in PROFANITY_LIST:
        if word in text_lower:
            return True
    return False

# ===== Global Comments =====
@app.route('/get_comments_global')
def get_comments_global():
    conn = get_db_connection()
    comments = conn.execute("SELECT username, comment FROM global_comments ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(c) for c in comments])

@app.route('/add_comment_global', methods=['POST'])
def add_comment_global():
    if 'username' not in session:
        return jsonify({"error": "not logged in"}), 403
    data = request.get_json()
    comment = data.get('comment', '').strip()
    
    if not comment:
        return jsonify({"error": "empty comment"}), 400
    
    # 🔒 Check for profanity
    if contains_profanity(comment):
        return jsonify({
            "error": "Your comment contains inappropriate language. Please keep comments respectful."
        }), 400
    
    # Check comment length (optional)
    if len(comment) > 500:
        return jsonify({"error": "Comment is too long. Maximum 500 characters."}), 400
    
    conn = get_db_connection()
    conn.execute("INSERT INTO global_comments (username, comment) VALUES (?, ?)", (session['username'], comment))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# ===== AUTH (Login/Register) =====
@app.route('/auth', methods=['GET', 'POST'])
def auth():
    login_error = None
    register_error = None
    show_form = None

    if request.method == "POST":
        action = request.form.get("action")
        username = request.form.get("username")
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")
        email = request.form.get("email")
        phone = request.form.get("phone")
        address = request.form.get("address")

        conn = get_db_connection()

        # ===== Login section =====
        if action == "login":
            user = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
            if not user:
                login_error = "Username not found"
                show_form = "login"
            elif user['is_banned'] == 1:  # NEW: Check if user is banned
                login_error = "This account has been banned. Please contact administrator."
                show_form = "login"
            elif not check_password_hash(user['password'], password):
                login_error = "Incorrect password"
                show_form = "login"
            else:
                # 🔒 Check if user is admin or staff
                if user['is_admin'] == 1:
                    login_error = "Admin accounts must use Admin Login"
                    show_form = "login"
                elif user['is_staff'] == 1:
                    login_error = "Staff accounts must use Staff Login"
                    show_form = "login"
                else:
                    # Regular user - allow login
                    session['user_id'] = user['id']
                    session['username'] = user['username']
                    session['is_admin'] = user['is_admin']
                    session['is_staff'] = user['is_staff']

                    # NEW: Update last login and set online status
                    current_time = datetime.now().strftime("%b %d, %Y - %I:%M %p")
                    conn.execute(
                        "UPDATE users SET last_login=?, is_online=1 WHERE id=?",
                        (current_time, user['id'])
                    )
                    conn.commit()
                    conn.close()
                    return redirect(url_for('home'))

        elif action == "register":
            if not username or not password or not confirm_password or not email or not phone or not address:
                register_error = "Please fill all fields"
                show_form = "register"
            elif password != confirm_password:
                register_error = "Passwords do not match"
                show_form = "register"
            else:
                # 🔒 Check for existing email, username, AND phone number
                existing_email = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
                existing_user = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
                existing_phone = conn.execute("SELECT * FROM users WHERE phone=?", (phone,)).fetchone()
                
                if existing_email:
                    register_error = "Email already exists"
                    show_form = "register"
                elif existing_user:
                    register_error = "Username already exists"
                    show_form = "register"
                elif existing_phone:
                    register_error = "Phone number already registered"
                    show_form = "register"
                else:
                    try:
                        created_at = datetime.now().strftime("%b %d, %Y - %I:%M %p")
                        # 🔒 Ensure regular users are not admin/staff and set default status
                        conn.execute(
                            "INSERT INTO users (username,password,email,phone,address,created_at,is_admin,is_staff,is_banned,is_online) VALUES (?,?,?,?,?,?,?,?,?,?)",
                            (username, generate_password_hash(password), email, phone, address, created_at, 0, 0, 0, 0)
                        )
                        conn.commit()
                        conn.close()
                        login_error = "Registered successfully! Please login."
                        show_form = "login"
                        return render_template("auth.html",
                                            login_error=login_error,
                                            register_error=None,
                                            show_form=show_form)
                    except sqlite3.IntegrityError:
                        register_error = "Error during registration"
                        show_form = "register"
            conn.close()

    template_args = {"login_error": login_error, "register_error": register_error}
    if show_form:
        template_args["show_form"] = show_form

    return render_template("auth.html", **template_args)

@app.route('/check_username', methods=['POST'])
def check_username():
    """Check if username is available"""
    data = request.get_json()
    username = data.get('username', '').strip()
    
    if not username:
        return jsonify({'available': False, 'message': 'Username is required'})
    
    conn = get_db_connection()
    existing_user = conn.execute(
        "SELECT id FROM users WHERE username = ?", 
        (username,)
    ).fetchone()
    conn.close()
    
    if existing_user:
        return jsonify({'available': False, 'message': 'Username already taken'})
    else:
        return jsonify({'available': True, 'message': 'Username available'})

@app.route('/check_phone', methods=['POST'])
def check_phone():
    """Check if phone number is available"""
    data = request.get_json()
    phone = data.get('phone', '').strip()
    
    if not phone:
        return jsonify({'available': False, 'message': 'Phone number is required'})
    
    # Validate phone format (11 digits)
    if not re.match(r'^\d{11}$', phone):
        return jsonify({'available': False, 'message': 'Phone number must be 11 digits'})
    
    conn = get_db_connection()
    existing_phone = conn.execute(
        "SELECT id FROM users WHERE phone = ?", 
        (phone,)
    ).fetchone()
    conn.close()
    
    if existing_phone:
        return jsonify({'available': False, 'message': 'Phone number already registered'})
    else:
        return jsonify({'available': True, 'message': 'Phone number available'})

@app.route('/get_menu_status')
def get_menu_status():
    try:
        conn = get_db_connection()
        rows = conn.execute("SELECT food, status FROM menu_status").fetchall()
        conn.close()

        # If no rows, return empty dict
        if not rows:
            return jsonify({})

        # Build dictionary {food: status}
        status_dict = {row['food']: row['status'] for row in rows}
        return jsonify(status_dict)

    except Exception as e:
        print("Error in /get_menu_status:", e)
        return jsonify({"error": "Server error"}), 500

# ===== Dashboard =====
@app.route('/dashboard')
def dashboard():
    conn = get_db_connection()
    menu_items = []

    for food, price in FOOD_PRICES.items():
        row = conn.execute("SELECT status FROM menu_status WHERE food=?", (food,)).fetchone()
        status = row['status'] if row else "Available"
        menu_items.append({
            'food': food,
            'category': 'Rice Meal',
            'status': status
        })

        # Ensure row exists
        if not row:
            conn.execute("INSERT INTO menu_status (food, status) VALUES (?, ?)", (food, 'Available'))

    conn.commit()
    conn.close()

    return render_template("dashboard.html", orders=menu_items)


# ===== Update status =====
@app.route('/update_status', methods=['POST'])
def update_status():
    if "user_id" not in session or not (session.get('is_staff') or session.get('is_admin')):
        return jsonify({"message": "Unauthorized"}), 403

    data = request.get_json()
    food = data.get('food')
    status = data.get('status')

    if not food or not status:
        return jsonify({"message": "Invalid data"}), 400

    conn = get_db_connection()
    conn.execute("UPDATE menu_status SET status=? WHERE food=?", (status, food))
    conn.commit()
    conn.close()

    return jsonify({"message": f"{food} status updated to {status}"})

# ===== Inventory =====
@app.route('/inventory')
def inventory():
    try:
        conn = get_db_connection()

        # ===== Summary Cards =====
        orders_data = [dict(row) for row in conn.execute("SELECT * FROM orders").fetchall()]
        users_data = [dict(row) for row in conn.execute("SELECT * FROM users").fetchall()]
        stock_data = [dict(row) for row in conn.execute("SELECT * FROM food_stock").fetchall()]
        ingredients_data = [dict(row) for row in conn.execute("SELECT * FROM ingredients").fetchall()]

        # ===== Ongoing orders (Not yet served) - counted by quantity =====
        def _qty_of(order):
            q = order.get('quantity', 0)
            try:
                return int(float(q))
            except Exception:
                return 0

        ongoing_orders = sum(
            _qty_of(order)
            for order in orders_data
            if str(order.get('status') or '').strip().lower() not in ('served', 'cancelled', 'completed')
            and str(order.get('payment_status') or '').strip().lower() != 'served'
        )

        # Total unique customers
        total_customers = len(
            set(order.get('user_id') for order in orders_data if order.get('user_id'))
        )

        # Total sales (quantity)
        total_sales = sum(order.get('quantity', 0) for order in orders_data)

        # Total amount (paid orders only)
        total_amount = sum(order.get('price', 0) for order in orders_data if order.get('payment_status') != 'Pending')

        # ===== Users (Staff + Customers) =====
        staff = [user for user in users_data if user.get('is_staff')]
        customers = [user for user in users_data if not user.get('is_staff') and not user.get('is_admin') and user.get('username') != 'admin']
        users = staff + customers

        # ===== Sales Chart Data =====
        sales_by_day = {}
        for order in orders_data:
            if order.get('payment_status') != 'Pending' and order.get('order_date'):
                date_part = order['order_date'].split(' - ')[0] if ' - ' in order['order_date'] else order['order_date']
                sales_by_day[date_part] = sales_by_day.get(date_part, 0) + order.get('price', 0)

        sales_labels = list(sales_by_day.keys())
        sales_totals = list(sales_by_day.values())

        # ===== Best-selling Items =====
        best_selling = {}
        for order in orders_data:
            food = order.get('food')
            quantity = order.get('quantity', 0)
            if food:
                best_selling[food] = best_selling.get(food, 0) + quantity

        sorted_best_selling = sorted(best_selling.items(), key=lambda x: x[1], reverse=True)[:5]
        best_selling_labels = [item[0] for item in sorted_best_selling]
        best_selling_totals = [item[1] for item in sorted_best_selling]

        # ===== Top 5 Customers by Spending =====
        customer_spending = {}
        for order in orders_data:
            if order.get('payment_status') != 'Pending':
                customer = order.get('cust_name')
                price = order.get('price', 0)
                if customer:
                    customer_spending[customer] = customer_spending.get(customer, 0) + price

        sorted_customers = sorted(customer_spending.items(), key=lambda x: x[1], reverse=True)[:5]
        top_customers_labels = [item[0] for item in sorted_customers]
        top_customers_totals = [item[1] for item in sorted_customers]

        # ===== Food Stock Distribution =====
        stock_labels = [item['food_name'] for item in stock_data]
        stock_totals = [item['stock'] for item in stock_data]
        food_stock = {item['food_name']: item['stock'] for item in stock_data}

        # ===== Ingredient Inventory =====
        ingredient_labels = [item['name'] for item in ingredients_data]
        ingredient_totals = [item['current_stock'] for item in ingredients_data]
        # Updated to include units in the display
        ingredient_stock = {item['name']: f"{item['current_stock']} {item['unit']}" for item in ingredients_data}

        conn.close()

        # ===== Render Template =====
        return render_template(
            "inventory.html",
            ongoing_orders=ongoing_orders,
            total_customers=total_customers,
            total_sales=total_sales,
            total_amount=total_amount,
            users=users,
            sales_labels=sales_labels,
            sales_totals=sales_totals,
            best_selling_labels=best_selling_labels,
            best_selling_totals=best_selling_totals,
            stock_labels=stock_labels,
            stock_totals=stock_totals,
            food_stock=food_stock,
            top_customers_labels=top_customers_labels,
            top_customers_totals=top_customers_totals,
            ingredient_labels=ingredient_labels,
            ingredient_totals=ingredient_totals,
            ingredient_stock=ingredient_stock,
            ingredients_data=ingredients_data  # Add this to pass full ingredient data
        )
    except Exception as e:
        print(f"Error in inventory: {e}")
        return render_template(
            "inventory.html",
            ongoing_orders=0,
            total_customers=0,
            total_sales=0,
            total_amount=0,
            users=[],
            sales_labels=[],
            sales_totals=[],
            best_selling_labels=[],
            best_selling_totals=[],
            stock_labels=[],
            stock_totals=[],
            food_stock={},
            top_customers_labels=[],
            top_customers_totals=[],
            ingredient_labels=[],
            ingredient_totals=[],
            ingredient_stock={},
            ingredients_data=[]
        )

# ===== Update Ingredient Stock =====
@app.route('/update_ingredient_stock', methods=['POST'])
def update_ingredient_stock():
    name = request.form.get('ingredient_name')
    new_stock = request.form.get('new_stock')
    action = request.form.get('action', 'update')  # 'add' or 'update'

    # Validate input
    if not new_stock or not new_stock.isdigit() or int(new_stock) < 0:
        return redirect(url_for('inventory'))

    conn = get_db_connection()
    
    if action == 'add':
        # Add to current stock
        current = conn.execute("SELECT current_stock FROM ingredients WHERE name = ?", (name,)).fetchone()
        if current:
            new_total = current['current_stock'] + int(new_stock)
            conn.execute("UPDATE ingredients SET current_stock = ? WHERE name = ?", (new_total, name))
    else:
        # Set to new value (update)
        conn.execute("UPDATE ingredients SET current_stock = ? WHERE name = ?", (int(new_stock), name))
    
    conn.commit()
    conn.close()

    return redirect(url_for('inventory'))

@app.route('/order_images')
def order_images():
    if not session.get('is_admin') and not session.get('is_staff'):
        return redirect(url_for('auth'))

    conn = get_db_connection()
    
    # Get orders with images, grouped by status
    pending_orders = conn.execute(
        "SELECT * FROM orders WHERE image_path IS NOT NULL AND tracker='Pending' ORDER BY order_date DESC"
    ).fetchall()
    
    approved_orders = conn.execute(
        "SELECT * FROM orders WHERE image_path IS NOT NULL AND tracker IN ('Approved', 'Preparing', 'Cooking', 'Ready') ORDER BY order_date DESC"
    ).fetchall()
    
    served_orders = conn.execute(
        "SELECT * FROM orders WHERE image_path IS NOT NULL AND payment_status='Served' ORDER BY order_date DESC"
    ).fetchall()
    
    # Get rejected orders with images
    rejected_orders = conn.execute(
        "SELECT * FROM rejected_orders WHERE image_path IS NOT NULL ORDER BY rejected_at DESC"
    ).fetchall()
    
    conn.close()
    
    return render_template('order_images.html',
                         pending_orders=[dict(order) for order in pending_orders],
                         approved_orders=[dict(order) for order in approved_orders],
                         served_orders=[dict(order) for order in served_orders],
                         rejected_orders=[dict(order) for order in rejected_orders])

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# === Setup ===
UPLOAD_FOLDER = os.path.join('static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ===== Add Order =====
@app.route('/add_order', methods=['GET', 'POST'])
def add_order():
    conn = get_db_connection()

    # ✅ If user is logged in, fetch their info
    cust_name = ''
    cust_contact = ''
    user_id = session.get('user_id')

    if user_id:
        user = conn.execute("SELECT username, phone FROM users WHERE id = ?", (user_id,)).fetchone()
        if user:
            cust_name = user['username']
            cust_contact = user['phone']

    # Prepare menu items with availability + rating + stock
    menu_items = []
    for food, price in FOOD_PRICES.items():
        # Check menu availability
        row = conn.execute("SELECT status FROM menu_status WHERE food=?", (food,)).fetchone()
        availability = row['status'] if row else "Available"

        # Get average rating
        rating_row = conn.execute("SELECT AVG(rating) as avg_rating FROM ratings WHERE food=?", (food,)).fetchone()
        rating = round(rating_row['avg_rating'], 1) if rating_row and rating_row['avg_rating'] else 0

        # Get current stock
        stock_row = conn.execute("SELECT stock FROM food_stock WHERE food_name=?", (food,)).fetchone()
        current_stock = stock_row['stock'] if stock_row else 0

        menu_items.append({
            "name": food,
            "price": price,
            "availability": availability,
            "rating": rating,
            "stock": current_stock  # Add stock information
        })

    # ===== IMAGE UPLOAD CONFIG =====
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # ensure folder exists

    # Handle POST (placing order)
    if request.method == 'POST':
        foods = request.form.getlist('food')
        quantities_list = request.form.getlist('quantity')
        cust_name = request.form.get('cust_name', '')
        cust_contact = request.form.get('cust_contact', '')
        order_date = datetime.now().strftime("%b %d, %Y - %I:%M %p")

        # Validate required fields
        if not foods or not quantities_list:
            conn.close()
            return "❌ Please select at least one food item and quantity.", 400

        # 🖼️ Handle image upload (optional)
        image_filename = None
        if 'order_image' in request.files:
            image = request.files['order_image']
            if image and allowed_file(image.filename):
                filename = secure_filename(image.filename)
                # Prefix timestamp to prevent name collisions
                image_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
                image.save(os.path.join(UPLOAD_FOLDER, image_filename))

        # Check stock availability for all items before creating any orders
        insufficient_stock_items = []
        for food, qty in zip(foods, quantities_list):
            qty = int(qty)
            
            # Check if food is available in menu
            menu_row = conn.execute("SELECT status FROM menu_status WHERE food=?", (food,)).fetchone()
            if menu_row and menu_row['status'] != 'Available':
                insufficient_stock_items.append(f"{food} (Not Available)")
                continue
            
            # Check stock availability
            stock_row = conn.execute("SELECT stock FROM food_stock WHERE food_name=?", (food,)).fetchone()
            
            if not stock_row:
                insufficient_stock_items.append(f"{food} (Not Found in Inventory)")
            elif stock_row['stock'] < qty:
                insufficient_stock_items.append(f"{food} (Available: {stock_row['stock']}, Ordered: {qty})")

        # If any items have insufficient stock, return error
        if insufficient_stock_items:
            conn.close()
            error_message = "❌ Order cannot be placed due to:\n" + "\n".join(f"• {item}" for item in insufficient_stock_items)
            return error_message, 400

        # If all checks pass, create the orders
        order_ids = []
        for food, qty in zip(foods, quantities_list):
            qty = int(qty)
            price = FOOD_PRICES.get(food, 100) * qty

            # ✅ Save order as Pending with image path
            cursor = conn.execute(
                "INSERT INTO orders (user_id, cust_name, cust_contact, order_date, food, quantity, price, image_path, tracker) VALUES (?,?,?,?,?,?,?,?,?)",
                (user_id, cust_name, cust_contact, order_date, food, qty, price, image_filename, 'Pending')
            )
            order_ids.append(cursor.lastrowid)

        conn.commit()
        conn.close()
        
        # ✅ ADD THIS FLASH MESSAGE
        flash("✅ Order placed successfully! Your order is now pending approval.", "success")
        return redirect(url_for('view_orders'))  # Redirect to view_orders

    conn.close()
    return render_template(
        "add_order.html",
        menu_items=menu_items,
        cust_name=cust_name,
        cust_contact=cust_contact
    )

def check_low_stock(food_name, new_stock, threshold=5):
    """Check if stock is low and create alert"""
    if new_stock <= threshold:
        conn = get_db_connection()
        created_at = datetime.now().strftime("%b %d, %Y - %I:%M %p")
        
        # Create low stock notification for admin/staff
        admin_users = conn.execute(
            "SELECT id FROM users WHERE is_admin=1 OR is_staff=1"
        ).fetchall()
        
        for admin in admin_users:
            conn.execute(
                "INSERT INTO order_notifications (user_id, message, created_at) VALUES (?, ?, ?)",
                (admin['id'], f"⚠️ LOW STOCK: {food_name} is running low! Current stock: {new_stock}", created_at)
            )
        
        conn.commit()
        conn.close()

@app.route('/get_food_stock')
def get_food_stock_api():
    """API endpoint to get current food stock"""
    try:
        stock = get_food_stock()  # Your existing function
        return jsonify(stock)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/view_orders')
def view_orders():
    conn = get_db_connection()

    orders_rows = []
    pending_orders_rows = []
    approved_orders_rows = []
    ready_pickup_rows = []
    served_orders_rows = []

    if session.get('user_id'):
        # Regular user orders (excluding served)
        orders_rows = conn.execute(
            "SELECT * FROM orders WHERE user_id=? AND payment_status != 'Served' ORDER BY order_date ASC",
            (session['user_id'],)
        ).fetchall()

        # Regular user served orders (only their own)
        served_orders_rows = conn.execute(
            "SELECT * FROM orders WHERE user_id=? AND payment_status='Served' ORDER BY order_date ASC",
            (session['user_id'],)
        ).fetchall()

    if session.get('is_admin') or session.get('is_staff'):
        # Pending orders (staff approves first)
        pending_orders_rows = conn.execute(
            "SELECT * FROM orders WHERE tracker='Pending' ORDER BY order_date ASC"
        ).fetchall()

        # Orders in progress (Approved, Preparing, Cooking)
        approved_orders_rows = conn.execute(
            "SELECT * FROM orders WHERE tracker IN ('Approved', 'Preparing', 'Cooking') AND payment_status != 'Served' ORDER BY order_date ASC"
        ).fetchall()

        # Ready to Pick Up orders
        ready_pickup_rows = conn.execute(
            "SELECT * FROM orders WHERE tracker='Ready' AND payment_status != 'Served' ORDER BY order_date ASC"
        ).fetchall()

        # All served orders
        served_orders_rows = conn.execute(
            "SELECT * FROM orders WHERE payment_status='Served' ORDER BY order_date ASC"
        ).fetchall()

    conn.close()

    # Convert to list of dicts
    orders = [dict(order) for order in orders_rows]
    pending_orders = [dict(order) for order in pending_orders_rows]
    approved_orders = [dict(order) for order in approved_orders_rows]
    ready_pickup = [dict(order) for order in ready_pickup_rows]
    served_orders = [dict(order) for order in served_orders_rows]

    return render_template(
        "view_orders.html",
        orders=orders,
        pending_orders=pending_orders,
        approved_orders=approved_orders,
        ready_pickup=ready_pickup,
        served_orders=served_orders
    )

# ===== Approve Pending Order (Staff/Admin) =====
@app.route("/approve_order/<int:order_id>", methods=["POST"])
def approve_order(order_id):
    if not session.get("is_staff") and not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Start transaction
        conn.execute("BEGIN TRANSACTION")
        
        # Get order details first
        order = cursor.execute(
            "SELECT * FROM orders WHERE id=? AND tracker='Pending'", 
            (order_id,)
        ).fetchone()
        
        if not order:
            conn.rollback()
            return jsonify({"success": False, "message": "Order not found or already processed"}), 404

        food_name = order['food']
        quantity = order['quantity']
        user_id = order['user_id']

        # Check current stock
        stock_row = cursor.execute(
            "SELECT stock FROM food_stock WHERE food_name=?", 
            (food_name,)
        ).fetchone()
        
        if not stock_row:
            conn.rollback()
            return jsonify({"success": False, "message": f"Food item '{food_name}' not found in inventory"}), 404

        current_stock = stock_row['stock']
        
        # Check if enough stock is available
        if current_stock < quantity:
            conn.rollback()
            return jsonify({
                "success": False, 
                "message": f"Insufficient stock for {food_name}. Available: {current_stock}, Ordered: {quantity}"
            }), 400

        # Calculate new stock
        new_stock = current_stock - quantity
        
        # Update food stock
        cursor.execute(
            "UPDATE food_stock SET stock=? WHERE food_name=?", 
            (new_stock, food_name)
        )

        # 🆕 NEW: AUTO-UPDATE MENU STATUS IF STOCK REACHES 0
        if new_stock == 0:
            cursor.execute(
                "UPDATE menu_status SET status = ? WHERE food = ?",
                ("Not Available", food_name)
            )

        # Update order status to "Approved" and mark as "Paid"
        cursor.execute(
            "UPDATE orders SET tracker='Approved', payment_status='Paid' WHERE id=?", 
            (order_id,)
        )

        # Create notification for the user
        created_at = datetime.now().strftime("%b %d, %Y - %I:%M %p")
        notification_message = f"Your order of {quantity} {food_name} has been approved!."
        
        cursor.execute(
            "INSERT INTO order_notifications (order_id, user_id, message, created_at) VALUES (?, ?, ?, ?)",
            (order_id, user_id, notification_message, created_at)
        )

        # Commit transaction
        conn.commit()

        # Return success response with stock information
        return jsonify({
            "success": True,
            "order": dict(order),
            "stock_update": {
                "food_name": food_name,
                "previous_stock": current_stock,
                "new_stock": new_stock,
                "quantity_deducted": quantity
            },
            "message": f"Order approved! {quantity} {food_name} deducted from inventory. Remaining stock: {new_stock}"
        })
        
    except Exception as e:
        conn.rollback()
        print(f"Error approving order: {str(e)}")
        return jsonify({"success": False, "message": f"Error: {str(e)}"}), 500
    finally:
        conn.close()

# ===== New: Check/Mark Pending Order as Paid =====
@app.route("/check_order/<int:order_id>", methods=["POST"])
def check_order(order_id):
    if not (session.get("is_staff") or session.get("is_admin")):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Update tracker to Approved and mark payment as Paid
        cursor.execute(
            "UPDATE orders SET tracker='Approved', payment_status='Paid' WHERE id=? AND tracker='Pending'",
            (order_id,)
        )
        conn.commit()

        # Return updated order
        order = cursor.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        if not order:
            return jsonify({"success": False, "message": "Order not found"}), 404

        return jsonify({"success": True, "order": dict(order)})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


# ===== User Orders API (UNCHANGED) =====
@app.route('/api/user_orders')
def api_user_orders():
    if not session.get('user_id'):
        return jsonify([])  # or 403 unauthorized

    conn = get_db_connection()
    orders = conn.execute(
        "SELECT id, order_date, cust_name, cust_contact, food, quantity, payment_status, tracker FROM orders WHERE user_id=?",
        (session['user_id'],)
    ).fetchall()
    conn.close()
    return jsonify([dict(order) for order in orders])


# Add this route to check for notifications
@app.route('/api/check_notifications')
def check_notifications():
    if 'user_id' not in session:
        return jsonify([])
    
    user_id = session['user_id']
    conn = get_db_connection()
    
    # Get unread notifications
    notifications = conn.execute(
        "SELECT * FROM order_notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC",
        (user_id,)
    ).fetchall()
    
    conn.close()
    return jsonify([dict(notif) for notif in notifications])

# Add this route to mark notifications as read
@app.route('/api/mark_notification_read/<int:notification_id>', methods=['POST'])
def mark_notification_read(notification_id):
    if 'user_id' not in session:
        return jsonify({"success": False})
    
    conn = get_db_connection()
    conn.execute(
        "UPDATE order_notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
        (notification_id, session['user_id'])
    )
    conn.commit()
    conn.close()
    
    return jsonify({"success": True})

# Add this route to your app.py
@app.route("/reject_order/<int:order_id>", methods=["POST"])
def reject_order(order_id):
    if not session.get("is_staff") and not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get order details before deleting
        order = cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        
        if not order:
            return jsonify({"success": False, "message": "Order not found"}), 404

        # Save to rejected_orders table first
        rejected_at = datetime.now().strftime("%b %d, %Y - %I:%M %p")
        rejected_by = session.get('username', 'Unknown')
        
        cursor.execute("""
            INSERT INTO rejected_orders 
            (original_order_id, user_id, cust_name, cust_contact, order_date, food, quantity, price, image_path, rejected_by, rejected_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order_id, order['user_id'], order['cust_name'], order['cust_contact'],
            order['order_date'], order['food'], order['quantity'], order['price'],
            order['image_path'], rejected_by, rejected_at
        ))

        # Then delete the order from orders table
        cursor.execute("DELETE FROM orders WHERE id = ?", (order_id,))
        
        # Create notification for the user
        notification_message = f"Your order of {order['quantity']} {order['food']} has been rejected by staff."
        
        cursor.execute(
            "INSERT INTO order_notifications (order_id, user_id, message, created_at) VALUES (?, ?, ?, ?)",
            (order_id, order['user_id'], notification_message, rejected_at)
        )
        
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Order rejected and moved to rejected orders!"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route("/update_order_status/<int:order_id>", methods=["POST"])
def update_order_status(order_id):
    if "user_id" not in session or not (session.get("is_admin") or session.get("is_staff")):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    new_status = request.json.get("status")
    if not new_status:
        return jsonify({"success": False, "message": "No status provided"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get order details first
        order = cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        if not order:
            return jsonify({"success": False, "message": "Order not found"}), 404

        # Update the tracker status
        cursor.execute("UPDATE orders SET tracker = ? WHERE id = ?", (new_status, order_id))
        
        # If status is "Ready", create notification and ensure payment_status is 'Paid'
        if new_status == 'Ready':
            cursor.execute("UPDATE orders SET payment_status = 'Paid' WHERE id = ?", (order_id,))
            
            # Check if there are multiple quantities of the same food for this user
            cursor.execute("""
                SELECT food, SUM(quantity) as total_quantity 
                FROM orders 
                WHERE user_id = ? AND tracker = 'Ready' AND payment_status = 'Paid'
                GROUP BY food
            """, (order['user_id'],))
            
            ready_orders = cursor.fetchall()
            
            # Create grouped notifications
            created_at = datetime.now().strftime("%b %d, %Y - %I:%M %p")
            
            for ready_order in ready_orders:
                food_name = ready_order['food']
                total_quantity = ready_order['total_quantity']
                
                if total_quantity > 1:
                    # Grouped notification for multiple quantities
                    notification_message = f"Your order of {total_quantity} {food_name} is ready for pickup!"
                else:
                    # Single item notification
                    notification_message = f"Your {food_name} order is ready for pickup!"
                
                # Check if similar notification already exists to avoid duplicates
                existing_notif = cursor.execute(
                    "SELECT id FROM order_notifications WHERE user_id = ? AND message = ? AND is_read = 0",
                    (order['user_id'], notification_message)
                ).fetchone()
                
                if not existing_notif:
                    cursor.execute(
                        "INSERT INTO order_notifications (order_id, user_id, message, created_at) VALUES (?, ?, ?, ?)",
                        (order_id, order['user_id'], notification_message, created_at)
                    )
        
        conn.commit()
        
        return jsonify({
            "success": True, 
            "new_status": new_status,
            "message": f"Order status updated to {new_status}"
        })
        
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route("/mark_order_served/<int:order_id>", methods=["POST"])
def mark_order_served(order_id):
    if not session.get("is_staff"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Human-friendly served_date format
        served_date = datetime.now().strftime("%b %d, %Y - %I:%M %p")

        # Get order details before updating
        order = cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        if not order:
            return jsonify({"success": False, "message": "Order not found"}), 404

        user_id = order['user_id']
        food_name = order['food']
        quantity = order['quantity']

        # Update order as served and save served_date
        cursor.execute(
            "UPDATE orders SET payment_status = 'Served', tracker = 'Served', served_date = ? WHERE id = ?",
            (served_date, order_id)
        )
        
        # Create notification for the user
        notification_message = f"Your order of {quantity} {food_name} has been served! Thank you for ordering at Leshley's Eatery!"
        
        cursor.execute(
            "INSERT INTO order_notifications (order_id, user_id, message, created_at) VALUES (?, ?, ?, ?)",
            (order_id, user_id, notification_message, served_date)
        )
        
        conn.commit()

        # Fetch the updated order with all details
        order = cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()

        if not order:
            return jsonify({"success": False, "message": "Order not found"}), 404

        return jsonify({
            "success": True,
            "order": dict(order),
            "message": "Order marked as served successfully!"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/admin_login', methods=['POST'])
def admin_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE username=? AND is_admin=1", (username,)).fetchone()
    conn.close()

    if user and check_password_hash(user['password'], password):
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['is_admin'] = True
        session['is_staff'] = False
        return jsonify({"success": True, "redirect": url_for('dashboard')})
    
    # 🔒 NEW: More specific error message
    return jsonify({"success": False, "message": "Invalid admin credentials or not an admin account"})

@app.route('/staff_login', methods=['POST'])
def staff_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE username=? AND is_staff=1", (username,)).fetchone()
    conn.close()

    if user and check_password_hash(user['password'], password):
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['is_staff'] = True
        session['is_admin'] = False
        return jsonify({"success": True, "redirect": url_for('dashboard')})
    
    # 🔒 NEW: More specific error message
    return jsonify({"success": False, "message": "Invalid staff credentials or not a staff account"})

def get_customer_users():
    """Helper function to get customer users data"""
    conn = get_db_connection()
    users = conn.execute(
        "SELECT id, username, email, phone, created_at, last_login, last_logout, is_banned, is_online FROM users WHERE is_admin=0 AND is_staff=0"
    ).fetchall()
    conn.close()
    return users

# ===== Admin: User Management (HTML Page) =====
@app.route("/admin/users")
def admin_users():
    if not session.get("is_admin"):
        return redirect(url_for("auth"))
    
    users = get_customer_users()
    return render_template("admin_users.html", users=users)

# ===== NEW: API endpoint for user data (JSON Data) =====
@app.route('/admin/users/data')
def admin_users_data():
    if not session.get("is_admin"):
        return jsonify({"error": "Unauthorized"}), 403
    
    users = get_customer_users()
    
    # Convert to list of dictionaries for JSON serialization
    users_list = [dict(user) for user in users]
    
    return jsonify(users_list)

# ===== User Details API Routes =====
@app.route('/admin/users/<int:user_id>/details')
def user_details(user_id):
    if not session.get("is_admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    
    conn = get_db_connection()
    user = conn.execute(
        "SELECT id, username, email, phone, created_at, last_login, last_logout, is_banned, is_online FROM users WHERE id = ?",
        (user_id,)
    ).fetchone()
    conn.close()
    
    if user:
        return jsonify({"success": True, "user_data": dict(user)})
    else:
        return jsonify({"success": False, "error": "User not found"})

@app.route('/admin/users/<int:user_id>/orders')
def user_orders(user_id):
    if not session.get("is_admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    
    conn = get_db_connection()
    orders = conn.execute(
        "SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC LIMIT 50",
        (user_id,)
    ).fetchall()
    conn.close()
    
    return jsonify({"success": True, "orders": [dict(order) for order in orders]})

@app.route('/admin/users/<int:user_id>/ratings')
def user_ratings(user_id):
    if not session.get("is_admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    
    conn = get_db_connection()
    
    # Get username first
    user = conn.execute("SELECT username FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        return jsonify({"success": False, "error": "User not found"})
    
    ratings = conn.execute(
        "SELECT * FROM ratings WHERE username = ? ORDER BY id DESC",
        (user['username'],)
    ).fetchall()
    conn.close()
    
    return jsonify({"success": True, "ratings": [dict(rating) for rating in ratings]})

@app.route('/admin/users/<int:user_id>/comments')
def user_comments(user_id):
    if not session.get("is_admin"):
        return jsonify({"success": False, "error": "Unauthorized"}), 403
    
    conn = get_db_connection()
    
    # Get username first
    user = conn.execute("SELECT username FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        return jsonify({"success": False, "error": "User not found"})
    
    comments = conn.execute(
        "SELECT * FROM global_comments WHERE username = ? ORDER BY id DESC",
        (user['username'],)
    ).fetchall()
    conn.close()
    
    return jsonify({"success": True, "comments": [dict(comment) for comment in comments]})

# Add ban/unban routes
@app.route('/ban_user/<int:user_id>', methods=['POST'])
def ban_user(user_id):
    if not session.get('is_admin'):
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    
    conn = get_db_connection()
    try:
        conn.execute("UPDATE users SET is_banned=1, is_online=0 WHERE id=?", (user_id,))
        conn.commit()
        
        # Get username for response
        user = conn.execute("SELECT username FROM users WHERE id=?", (user_id,)).fetchone()
        conn.close()
        
        return jsonify({"success": True, "message": f"User {user['username']} has been banned"})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/unban_user/<int:user_id>', methods=['POST'])
def unban_user(user_id):
    if not session.get('is_admin'):
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    
    conn = get_db_connection()
    try:
        conn.execute("UPDATE users SET is_banned=0 WHERE id=?", (user_id,))
        conn.commit()
        
        # Get username for response
        user = conn.execute("SELECT username FROM users WHERE id=?", (user_id,)).fetchone()
        conn.close()
        
        return jsonify({"success": True, "message": f"User {user['username']} has been unbanned"})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500

# ===== Logout =====
@app.route('/logout')
def logout():
    user_id = session.get('user_id')
    if user_id:
        conn = get_db_connection()
        # NEW: Update last logout and set offline status
        current_time = datetime.now().strftime("%b %d, %Y - %I:%M %p")
        conn.execute(
            "UPDATE users SET last_logout=?, is_online=0 WHERE id=?",
            (current_time, user_id)
        )
        conn.commit()
        conn.close()
    session.clear()
    return redirect(url_for('auth'))


if __name__ == "__main__":
    app.run(debug=True)
