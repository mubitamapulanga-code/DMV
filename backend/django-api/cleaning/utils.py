import re
from .models import CleaningRule

def normalize_value(value, category):
    """
    Normalizes a single value based on the rules in the database.
    """
    if not value or not isinstance(value, str):
        return value
        
    value = value.strip()
    
    # Fetch active rules for the category
    rules = CleaningRule.objects.filter(category=category, is_active=True)
    
    for rule in rules:
        # Check for exact match (case insensitive) or regex match
        try:
            if re.fullmatch(rule.pattern, value, re.IGNORECASE):
                return rule.replacement
            # Simple substring replacement if not a complex regex
            if rule.pattern.lower() == value.lower():
                return rule.replacement
        except re.error:
            # Fallback to simple string match if regex is invalid
            if rule.pattern.lower() == value.lower():
                return rule.replacement
                
    return value

def clean_dataframe(df, category_mapping):
    """
    Cleans an entire pandas DataFrame.
    category_mapping: dict mapping column names to CleaningRule categories.
    Example: {'institution_name': 'INSTITUTION', 'degree': 'PROGRAMME'}
    """
    cleaned_df = df.copy()
    
    for column, category in category_mapping.items():
        if column in cleaned_df.columns:
            cleaned_df[column] = cleaned_df[column].apply(lambda x: normalize_value(x, category))
            
    return cleaned_df
