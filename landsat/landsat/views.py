from django.shortcuts import render

def home(request):
    return render(request,'layout.html')
def about(request):
    return render(request,'index.html')