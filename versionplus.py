import json

def increment_all_versions():
    # Define the JSON file path - UPDATE THIS PATH
    json_file = 'manifest.json'  # Replace with your actual JSON file path
    
    try:
        # Read the JSON file
        with open(json_file, 'r') as file:
            data = json.load(file)
        
        print(f"Found {len(data)} items in the JSON file")
        
        # Track changes
        updated_count = 0
        
        # Iterate through each object in the array
        for i, item in enumerate(data):
            if 'version' in item:
                try:
                    current_version = item['version']
                    # Convert to float and increment by 0.1
                    version_float = float(current_version)
                    new_version = version_float + 0.1
                    
                    # Update the version (format to one decimal place)
                    item['version'] = f"{new_version:.1f}"
                    updated_count += 1
                    
                    print(f"  {item['display_name']}: {current_version} → {item['version']}")
                    
                except ValueError:
                    print(f"  ❌ {item['display_name']}: Invalid version '{current_version}'")
            else:
                print(f"  ❌ Item {i}: No 'version' key found")
        
        # Write back to the JSON file
        with open(json_file, 'w') as file:
            json.dump(data, file, indent=2)
        
        print(f"\n✅ Successfully updated {updated_count} versions")
        
    except FileNotFoundError:
        print(f"❌ File '{json_file}' not found. Please check the file path.")
    except json.JSONDecodeError:
        print("❌ Error: File is not valid JSON")
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")

if __name__ == "__main__":
    increment_all_versions()