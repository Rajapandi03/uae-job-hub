import sys
import os

BASE_DIR = r"c:\Users\Pandi\OneDrive\Desktop\itjob_uae\scrapers"
sys.path.append(BASE_DIR)

from common import get_supabase, logger

def clear_hiring_posts():
    client = get_supabase()
    if not client:
        print("No client")
        return
    try:
        # Delete all records by filtering where active=True or False
        # Supabase python client requires a filter to delete multiple 
        res1 = client.table("hiring_posts").delete().eq("active", True).execute()
        res2 = client.table("hiring_posts").delete().eq("active", False).execute()
        # also try to just delete all where id is not null (if id exists, wait, PK is source_post_id)
        res3 = client.table("hiring_posts").delete().neq("source_post_id", "dummy").execute()
        print("Deleted stale records.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clear_hiring_posts()
