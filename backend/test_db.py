from sqlalchemy import text
from app.database import engine


def test_connection():
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version()"))
            print("Database connection successful!")
            print(result.scalar())

    except Exception as error:
        print("Database connection failed!")
        print(error)


if __name__ == "__main__":
    test_connection()