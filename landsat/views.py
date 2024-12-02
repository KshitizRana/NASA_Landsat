
from django.shortcuts import render
from django.http import JsonResponse
import pandas as pd
import requests
from shapely.geometry import Point, Polygon

def home(request):
    return render(request,'layout.html')
def displayid(request):
    return render(request,'index.html')



df = pd.read_csv('../landsat/data/landsat_agg.csv')
df.drop(['Unnamed: 0'],axis=1,inplace=True,errors='ignore')

def point_in_polygon(lat, lon, upper_left, upper_right, lower_left, lower_right):
    """_summary_

    Parameters
    ----------
    lat : Intended latitude
    lon : Intended longitude
    upper_left : Upper Left Coordinates of Landsat scene
    upper_right : Upper Right Coordinates of Landsat scene
    lower_left : Lower Left Coordinates of Landsat scene
    lower_right : Lower Right Coordinates of Landsat scene

    Returns True or False after analysing 
    """
    # Extract latitude and longitude for the bounding box corners
    min_lat = min(lower_left[0], lower_right[0])
    max_lat = max(upper_left[0], upper_right[0])
    min_lon = min(upper_left[1], lower_left[1])
    max_lon = max(upper_right[1], lower_right[1])
    
    if min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
        return True
    return False

def check_point_in_polygon(request):
    """
    Providing data to point_to_polygon
    Parameters
    ----------
    request : Request recieved from js

    Returns-Landsat_Scene_ID
    """
    if request.method=='GET':
            lat=float(request.GET.get('lat',0))
            lon=float(request.GET.get('lon',0))
            for index, row in df.iterrows():
                upper_left = (row['Corner_Upper_Left_Latitude'], row['Corner_Upper_Left_Longitude'])
                upper_right = (row['Corner_Upper_Right_Latitude'], row['Corner_Upper_Right_Longitude'])
                lower_left = (row['Corner_Lower_Left_Latitude'], row['Corner_Lower_Left_Longitude'])
                lower_right = (row['Corner_Lower_Right_Latitude'], row['Corner_Lower_Right_Longitude'])

            # Check if the point is inside the polygon
                if point_in_polygon(lat, lon, upper_left, upper_right, lower_left, lower_right):
                    return JsonResponse({'Display_ID': row['Display_ID']})
                
            return JsonResponse({'Display_ID': None})
                