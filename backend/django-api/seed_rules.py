import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from cleaning.models import CleaningRule

def seed_rules():
    rules = [
        # Institutions
        ('UNZA', 'University of Zambia', 'INSTITUTION'),
        ('U.Z', 'University of Zambia', 'INSTITUTION'),
        ('The University of Zambia', 'University of Zambia', 'INSTITUTION'),
        ('CBU', 'Copperbelt University', 'INSTITUTION'),
        ('Copperbelt Uni', 'Copperbelt University', 'INSTITUTION'),
        ('Mulungushi', 'Mulungushi University', 'INSTITUTION'),
        
        # Programmes
        ('Bsc CS', 'Bachelor of Science in Computer Science', 'PROGRAMME'),
        ('B.Sc Computer Science', 'Bachelor of Science in Computer Science', 'PROGRAMME'),
        ('Bachelor of Comp Sci', 'Bachelor of Science in Computer Science', 'PROGRAMME'),
        
        # Provinces
        ('LSK', 'Lusaka', 'PROVINCE'),
        ('C/Belt', 'Copperbelt', 'PROVINCE'),
        ('CB', 'Copperbelt', 'PROVINCE'),
    ]

    for pattern, replacement, category in rules:
        CleaningRule.objects.get_or_create(
            pattern=pattern,
            replacement=replacement,
            category=category,
            name=f"Rule for {pattern}"
        )
    
    print(f"Successfully seeded {len(rules)} cleaning rules.")

if __name__ == '__main__':
    seed_rules()
