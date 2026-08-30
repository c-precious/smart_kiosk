from database.db import get_db_connection

conn = get_db_connection()
cursor = conn.cursor()

query = """
ALTER TABLE products
ADD COLUMN category VARCHAR(100)
"""

cursor.execute(query)

conn.commit()

print("Category column added successfully!")

cursor.close()
conn.close()