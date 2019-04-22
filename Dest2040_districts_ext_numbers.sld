<?xml version="1.0" encoding="ISO-8859-1"?>
<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
  <NamedLayer>
    <Name>Default Polygon</Name>
    <UserStyle>
      <Title>Default polygon style</Title>
      <Abstract>A sample style that just draws out a solid gray interior with a black 1px outline</Abstract>
      <FeatureTypeStyle>      
         <Rule>
          <Title>Polygon</Title>
<!--      
          <MinScaleDenominator>50</MinScaleDenominator>
          <MaxScaleDenominator>1600000</MaxScaleDenominator>    
-->   
        <ogc:Filter>
            <ogc:PropertyIsGreaterThanOrEqualTo>
                <ogc:PropertyName>district_num</ogc:PropertyName>   
                <ogc:Literal>51</ogc:Literal>
           </ogc:PropertyIsGreaterThanOrEqualTo>
        </ogc:Filter>            
          <PolygonSymbolizer>
<!--          
            <Fill>   
                <CssParameter name="fill">#fefffe</CssParameter>
            </Fill>      
-->   
            <Stroke>
              <CssParameter name="stroke">#000000</CssParameter>
              <CssParameter name="stroke-width">1.2</CssParameter>
            </Stroke>
          </PolygonSymbolizer>         

          <TextSymbolizer>              
            <Label>            
              <PropertyName xmlns="http://www.opengis.net/ogc">district_num</PropertyName>            </Label>    
            <Font>
              <CssParameter name="font-family">Arial</CssParameter>
              <CssParameter name="font-size">14</CssParameter>
              <CssParameter name="font-weight">Bold</CssParameter>       
            </Font>    
            <LabelPlacement>
              <PointPlacement>
                <AnchorPoint>
                  <AnchorPointX>0.5</AnchorPointX>
                  <AnchorPointY>0.5</AnchorPointY>
                </AnchorPoint>
              </PointPlacement>              
            </LabelPlacement>
            <Fill>
              <CssParameter name="fill">#b22400</CssParameter>
            </Fill>           
            <VendorOption name="group">true</VendorOption>
          </TextSymbolizer> 
        </Rule>
        

        <Rule>
           <Title>Polygon</Title>
<!--          
            <MinScaleDenominator>50</MinScaleDenominator>
            <MaxScaleDenominator>1600000</MaxScaleDenominator>    
-->  
        <ogc:Filter>
            <ogc:PropertyIsLessThan>
                <ogc:PropertyName>district_num</ogc:PropertyName>           
                <ogc:Literal>50</ogc:Literal>
             </ogc:PropertyIsLessThan>
        </ogc:Filter> 
         <PolygonSymbolizer>
   <!--         <Fill>   
              <CssParameter name="fill">#fefffe</CssParameter>
            </Fill>      -->   
            <Stroke>
              <CssParameter name="stroke">#000000</CssParameter>
              <CssParameter name="stroke-width">1.2</CssParameter>
            </Stroke>
          </PolygonSymbolizer>  
          <TextSymbolizer>              
            <Label>            
 <!--             Note: piece below sets 2-line label, but is very temperamental; DON'T SCREW WITH THE SPACING
                  Comment no longer relevant - BK 04/21/2019
 -->
              <ogc:PropertyName>district_num</ogc:PropertyName></Label>    
            <Font>
              <CssParameter name="font-family">Arial</CssParameter>
              <CssParameter name="font-size">10</CssParameter>
              <CssParameter name="font-weight">Bold</CssParameter>       
            </Font>    
            <LabelPlacement>
              <PointPlacement>
                <AnchorPoint>
                  <AnchorPointX>0.5</AnchorPointX>
                  <AnchorPointY>0.5</AnchorPointY>
                </AnchorPoint>
              </PointPlacement>               
            </LabelPlacement>                               
            <Fill>
              <CssParameter name="fill">#b22400</CssParameter>
            </Fill>           
            <VendorOption name="group">true</VendorOption>
          </TextSymbolizer>                 
        </Rule>
           
        
        <Rule>
          <Title>Polygon</Title>        
          <MinScaleDenominator>1600000</MinScaleDenominator>
          <MaxScaleDenominator>100000000</MaxScaleDenominator>
          <PolygonSymbolizer>
   <!--         <Fill> 
               <CssParameter name="fill">#fefffe</CssParameter>
            </Fill>                -->            
            <Stroke>
  <!--            <CssParameter name="stroke">#002222</CssParameter>  -->
              <CssParameter name="stroke">#000000</CssParameter> 
              <CssParameter name="stroke-width">0.8</CssParameter>
            </Stroke>
          </PolygonSymbolizer>                           
        </Rule>

      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
