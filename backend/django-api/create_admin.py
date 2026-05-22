import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import User

def create_superuser():
    username = 'admin'
    email = 'admin@hea.gov.zm'
    password = 'adminpassword123'
    
    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role='SUPER_ADMIN'
        )
        print(f"Superuser created: {username} / {password}")
    else:
        print("Superuser already exists.")

if __name__ == '__main__':
    create_superuser()
