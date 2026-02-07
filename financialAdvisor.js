// Financial Advisor - Main module
// Handles expense tracking, analysis, and advice

const sqlite3 = require('better-sqlite3');
const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'financial', 'transactions.db');
const PROFILE_PATH = path.join(__dirname, 'data', 'financial', 'financial_profile.json');

class FinancialAdvisor {
    constructor() {
        this.db = null;
        this.initialized = false;
    }

    /**
     * Initialize database and storage
     */
    async initialize() {
        try {
            // Create directories
            const dataDir = path.dirname(DB_PATH);
            await fs.mkdir(dataDir, { recursive: true });

            // Initialize SQLite database
            this.db = new sqlite3(DB_PATH);

            // Create tables
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    date DATE NOT NULL,
                    description TEXT,
                    amount DECIMAL(10,2) NOT NULL,
                    category TEXT,
                    merchant TEXT,
                    account TEXT,
                    type TEXT CHECK(type IN ('income', 'expense')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_user_date ON transactions(user_id, date);
                CREATE INDEX IF NOT EXISTS idx_category ON transactions(category);

                CREATE TABLE IF NOT EXISTS monthly_summaries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    month TEXT NOT NULL,
                    total_income DECIMAL(10,2) DEFAULT 0,
                    total_expenses DECIMAL(10,2) DEFAULT 0,
                    net DECIMAL(10,2) DEFAULT 0,
                    top_category TEXT,
                    top_category_amount DECIMAL(10,2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, month)
                );
            `);

            this.initialized = true;
            console.log('✅ Financial Advisor initialized');
            return true;
        } catch (error) {
            console.error('❌ Financial Advisor initialization error:', error);
            return false;
        }
    }

    /**
     * Add a manual transaction
     */
    addTransaction(userId, transaction) {
        const { date, description, amount, category, merchant, account, type } = transaction;

        const stmt = this.db.prepare(`
            INSERT INTO transactions (user_id, date, description, amount, category, merchant, account, type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(userId, date, description, amount, category, merchant, account, type);

        console.log(`✅ Transaction added: ${description} - ${amount}`);
        return result.lastInsertRowid;
    }

    /**
     * Get monthly summary
     */
    getMonthlySummary(userId, month) {
        // Month format: '2026-02'
        const startDate = `${month}-01`;
        const endDate = `${month}-31`;

        const summary = this.db.prepare(`
            SELECT
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
                SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net
            FROM transactions
            WHERE user_id = ? AND date >= ? AND date <= ?
        `).get(userId, startDate, endDate);

        // Get spending by category
        const categories = this.db.prepare(`
            SELECT category, SUM(amount) as total
            FROM transactions
            WHERE user_id = ? AND date >= ? AND date <= ? AND type = 'expense'
            GROUP BY category
            ORDER BY total DESC
        `).all(userId, startDate, endDate);

        return {
            month,
            income: summary.total_income || 0,
            expenses: summary.total_expenses || 0,
            net: summary.net || 0,
            categories: categories || []
        };
    }

    /**
     * Get spending by category
     */
    getCategoryBreakdown(userId, startDate, endDate) {
        const categories = this.db.prepare(`
            SELECT
                category,
                SUM(amount) as total,
                COUNT(*) as count,
                AVG(amount) as average
            FROM transactions
            WHERE user_id = ? AND date >= ? AND date <= ? AND type = 'expense'
            GROUP BY category
            ORDER BY total DESC
        `).all(userId, startDate, endDate);

        return categories;
    }

    /**
     * Get recent transactions
     */
    getRecentTransactions(userId, limit = 10) {
        const transactions = this.db.prepare(`
            SELECT *
            FROM transactions
            WHERE user_id = ?
            ORDER BY date DESC, created_at DESC
            LIMIT ?
        `).all(userId, limit);

        return transactions;
    }

    /**
     * Search transactions
     */
    searchTransactions(userId, query) {
        const transactions = this.db.prepare(`
            SELECT *
            FROM transactions
            WHERE user_id = ? AND (
                description LIKE ? OR
                merchant LIKE ? OR
                category LIKE ?
            )
            ORDER BY date DESC
            LIMIT 50
        `).all(userId, `%${query}%`, `%${query}%`, `%${query}%`);

        return transactions;
    }

    /**
     * Load user's financial profile
     */
    async loadProfile(userId) {
        try {
            const data = await fs.readFile(PROFILE_PATH, 'utf8');
            const profiles = JSON.parse(data);
            return profiles[userId] || this.createDefaultProfile(userId);
        } catch (error) {
            return this.createDefaultProfile(userId);
        }
    }

    /**
     * Save user's financial profile
     */
    async saveProfile(userId, profile) {
        try {
            let profiles = {};
            try {
                const data = await fs.readFile(PROFILE_PATH, 'utf8');
                profiles = JSON.parse(data);
            } catch (error) {
                // File doesn't exist
            }

            profiles[userId] = {
                ...profile,
                last_updated: new Date().toISOString()
            };

            await fs.writeFile(PROFILE_PATH, JSON.stringify(profiles, null, 2));
            console.log('✅ Profile saved');
        } catch (error) {
            console.error('❌ Error saving profile:', error);
        }
    }

    /**
     * Create default profile
     */
    createDefaultProfile(userId) {
        return {
            user_id: userId,
            monthly_income: 0,
            monthly_expenses: 0,
            net_position: 0,
            debt: 0,
            savings: 0,
            goals: [],
            created: new Date().toISOString()
        };
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = new FinancialAdvisor();
