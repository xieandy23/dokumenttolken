from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from models import ChatMessage
from openai import OpenAI
import os
from dotenv import load_dotenv
from PyPDF2 import PdfReader
import io
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

vector_store = None

active_documents = []

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    global vector_store, active_documents
    content = await file.read()
    pdf = PdfReader(io.BytesIO(content))
    pdf_content = ""
    for page in pdf.pages:
        pdf_content += page.extract_text()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(pdf_content)

    embeddings = OpenAIEmbeddings()
    
    if vector_store is None:
        vector_store = FAISS.from_texts(chunks, embeddings)
    else:

        vector_store.add_texts(chunks)
    
    active_documents.append(file.filename)
    
    return {
        "filename": file.filename,
        "message": "PDF har laddats upp och bearbetats för RAG",
        "active_documents": active_documents
    }

@app.post("/chat")
async def chat(chat_message: ChatMessage):
    if vector_store is None:
        return {"response": "Vänligen ladda upp en eller flera PDF:er först."}


    llm = ChatOpenAI(model_name="gpt-4o-mini", temperature=0)
    
    template = """Du är en hjälpsam assistent som har i uppgift att hjälpa användare att tolka dokument som kanske innehåller
    språk som är för avancerad för användaren. Försök att ge så tydliga och enkla svar som möjligt och undvik att ge för mycket
    information på en gång. 
    Använd följande information för att svara på frågan:
    {context}
    
    Om du inte hittar ett specifikt svar i informationen, ge ditt bästa råd baserat på allmän kunskap om bostadsrätter.
    
    Fråga: {question}
    Svar:"""
    
    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=template,
    )

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vector_store.as_retriever(),
        chain_type_kwargs={"prompt": prompt}
    )

    result = qa_chain({"query": chat_message.message})

    return {"response": result["result"]}

@app.get("/")
async def root():
    return {"message": "Välkommen till din Dokumenttolk!"}

@app.post("/clear-memory")
async def clear_memory():
    global vector_store, active_documents
    vector_store = None
    active_documents = []
    return {"message": "Minnet har rensats", "active_documents": []}

@app.get("/active-documents")
async def get_active_documents():
    return {"active_documents": active_documents}
