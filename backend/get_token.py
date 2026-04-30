import os
from google_auth_oauthlib.flow import InstalledAppFlow

# The exact permission we need: to send emails
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def main():
    if not os.path.exists('credentials.json'):
        print("❌ Error: You must put credentials.json in this same folder first!")
        return

    print("Opening browser for you to log in...")
    flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
    
    # This opens your browser so you can select evalis.team@gmail.com
    creds = flow.run_local_server(port=0)

    # Save the generated token so the backend can use it forever
    with open('token.json', 'w') as token:
        token.write(creds.to_json())
        
    print("✅ SUCCESS! token.json has been created in the backend folder!")

if __name__ == '__main__':
    main()
