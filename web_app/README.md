To run this repo, below is what is needed:
* There needs to be a Gradio link that hosts stable audio 3 on a GPU. Get the Gradio link.
* Then in your terminal 1, run the below command with the Gradio link:
  ```
  lsof -ti :8000 | xargs kill -9 
  python web_app/backend/main.py --gradio-url [GRADIO URL!]
  ```
* In your terminal 2, run the below command:
  ```
  cd web_app/frontend
  npm run dev
  ```