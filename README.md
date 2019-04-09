# lrtp2040na-od-app
Origin/destination app for LRTP 2040 Needs Assessment

The source code for this app was originally written by Mary McShane for the 2014 LRTP using OpenLayers version 2. 

It was migrated to OpenLayers version 3 by Ethan Ebinger in 2017. 

In 2018 it was (minimally) modified by yours truly to read data from a PostGIS data source rather than an Oracle/ArcGIS datasource. 

It is currently being modified by yours truly for the  2040 LRTP. This work was originally envisioned as being minimal, but may wind up being more substantive, e.g., reading tabular data from in-memory arrays loaded from CSV files rather than via WFS requests to GeoServer. The tables in question are quite small (ca. 50 x 50 arrays of integers), and the inherited code didn't even bother to perform filetered WFS requests - the entire table in question was always loaded, and as no caching/memoization was performed, this could happen multiple times. We'll see how far I get with this.
