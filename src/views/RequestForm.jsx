import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Flashbar,
  FileInput,
  SpaceBetween,
  Table,
  Icon,
  Button,
} from '@cloudscape-design/components';
import { put, post } from 'aws-amplify/api';
import { v4 as uuid } from 'uuid';
import NavBar from '../components/NavBar';
import { uploadData } from 'aws-amplify/storage';
import { withTranslation } from 'react-i18next';
import './RequestForm.css';

const apiName = 'fcjemergency';
const path = '/requesters';

function RequestForm(props) {
  const [name, setName] = useState('');
  const [phoneNumber, setphoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [township, setTownship] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [personCount, setPersonCount] = useState();
  const [supply, setSupply] = useState(0);
  const [bag, setBag] = useState(0);
  const [water, setWater] = useState(0);
  const [food, setFood] = useState(0);
  const [shelter, setShelter] = useState(0);
  const [bodyBag, setBodyBag] = useState(0);
  const [feminineProducts, setFeminineProducts] = useState(0);
  const [flashItem, setFlashItem] = useState([]);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [images, setImages] = React.useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const { t } = props;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      // Create preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    // Reset the file input
    document.getElementById('imageUpload').value = '';
  };

  // Update your onSubmit function

  const onSubmit = async () => {
    setIsUploading(true);

    let imageKey = null;

    if (!name || !phoneNumber || !address || !city || !township) {
      setFlashItem([
        {
          type: 'error',
          content: t('request-page.warning_mess'),
          dismissible: true,
          dismissLabel: 'Dismiss message',
          onDismiss: () => setFlashItem([]),
          id: 'warning',
        },
      ]);
      return;
    }

    const data = {
      id: uuid(),
      name: name,
      phoneNumber: phoneNumber,
      address: address,
      city: city,
      township: township,
      mapLink: mapLink,
      personCount: personCount,
      supply: supply,
      bag: bag,
      water: water,
      food: food,
      shelter: shelter,
      bodyBag: bodyBag,
      feminineProducts: feminineProducts,
    };

    try {
      // Upload image to S3 if one is selected
      if (images.length > 0) {
        const fileName = `public/${uuid()}-${images[0].name}`;
        await uploadData({
          path: fileName,
          data: images[0],
          options: {
            contentType: images[0].type,
          },
        }).result;
        imageKey = fileName;
      }

      const data = {
        id: uuid(),
        name: name,
        phoneNumber: phoneNumber,
        address: address,
        city: city,
        township: township,
        mapLink: mapLink,
        personCount: personCount,
        supply: supply,
        bag: bag,
        water: water,
        food: food,
        shelter: shelter,
        bodyBag: bodyBag,
        feminineProducts: feminineProducts,
        // Add the image key if uploaded
        imageKey: imageKey,
      };

      // Rest of your code remains unchanged
      const restOperation = post({
        apiName: apiName,
        path: path,
        options: {
          body: data,
        },
      });

      const response = await restOperation.response;
      setFlashItem([
        {
          type: 'success',
          content: t('request-page.success_mess'),
          dismissible: true,
          dismissLabel: 'Dismiss message',
          onDismiss: () => setFlashItem([]),
          id: 'success',
        },
      ]);
    } catch (error) {
      console.log(error);
      setFlashItem([
        {
          type: 'error',
          content: t('request-page.error_mess'),
          dismissible: true,
          dismissLabel: 'Dismiss message',
          onDismiss: () => setFlashItem([]),
          id: 'error',
        },
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {/* <NavBar /> */}
      <Outlet />
      <div class="container">
        <h1>{t('request-page.title')}</h1>
        <div class="subtitle">{t('request-page.desc')}</div>
        <div class="form-container">
          <h2 class="section-heading">
            {t('request-page.form.title')}
          </h2>
          <div class="section-subtitle">
            {t('request-page.form.desc')}
          </div>

          <form action="request-help-step2.html" method="get">
            <div class="form-group">
              <label class="form-label" for="fullName">
                {t('request-page.form.name')}
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                class="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('request-page.form.name_place')}
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="phoneNumber">
                {t('request-page.form.phone')}
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                class="form-input"
                value={phoneNumber}
                onChange={(e) => setphoneNumber(e.target.value)}
                placeholder={t('request-page.form.phone_place')}
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="address">
                {t('request-page.form.address')}
              </label>
              <textarea
                id="address"
                name="address"
                class="form-textarea"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('request-page.form.address_place')}
                required
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label" for="city">
                {t('request-page.form.city')}
              </label>
              <input
                type="text"
                id="city"
                name="city"
                class="form-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('request-page.form.city_place')}
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="township">
                {t('request-page.form.township')}
              </label>
              <input
                type="text"
                id="township"
                name="township"
                class="form-input"
                value={township}
                onChange={(e) => setTownship(e.target.value)}
                placeholder={t('request-page.form.township_place')}
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="googleMapsLink">
                {t('request-page.form.location')}
              </label>
              <div class="google-maps-container">
                <input
                  type="text"
                  id="googleMapsLink"
                  name="googleMapsLink"
                  class="form-input google-maps-input"
                  value={mapLink}
                  onChange={(e) => setMapLink(e.target.value)}
                  placeholder={t('request-page.form.location_place')}
                />
                {/* <button type="button" class="get-location-btn">
                                <span class="icon">📍</span> Get Location
                            </button> */}
              </div>
              <div class="location-note">
                {t('request-page.form.location_desc')}
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="affectedCount">
                {t('request-page.form.individuals')}
              </label>
              <input
                type="number"
                id="affectedCount"
                name="affectedCount"
                class="form-input"
                value={personCount}
                onChange={(e) => setPersonCount(e.target.value)}
                placeholder={t('request-page.form.individuals_place')}
                min="0"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">
                {t('request-page.form.type')}
              </label>
              <div class="request-types">
                <div class="request-type">
                  <div>
                    <div class="request-type-label">
                      {t('request-page.form.supply')}
                    </div>
                    <div class="request-type-description">
                      {t('request-page.form.supply_desc')}
                    </div>
                    <div class="request-type-details">
                      <label for="medicalQuantity">
                        {t('request-page.form.quanity')}{' '}
                      </label>
                      <input
                        type="number"
                        id="medicalQuantity"
                        class="quantity-input"
                        value={supply}
                        onChange={(e) => setSupply(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div class="request-type">
                  <div>
                    <div class="request-type-label">
                      {t('request-page.form.bag')}
                    </div>
                    <div class="request-type-description">
                      {t('request-page.form.bag_desc')}
                    </div>
                    <div class="request-type-details">
                      <label for="sleepingBagsQuantity">
                        {t('request-page.form.quanity')}{' '}
                      </label>
                      <input
                        type="number"
                        id="sleepingBagsQuantity"
                        class="quantity-input"
                        value={bag}
                        onChange={(e) => setBag(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div class="request-type">
                  <div>
                    <div class="request-type-label">
                      {t('request-page.form.water')}
                    </div>
                    <div class="request-type-description">
                      {t('request-page.form.water_desc')}
                    </div>
                    <div class="request-type-details">
                      <label for="waterQuantity">
                        {t('request-page.form.quatity_liter')}{' '}
                      </label>
                      <input
                        type="number"
                        id="waterQuantity"
                        class="quantity-input"
                        value={water}
                        onChange={(e) => setWater(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div class="request-type">
                  <div>
                    <div class="request-type-label">
                      {t('request-page.form.food')}
                    </div>
                    <div class="request-type-description">
                      {t('request-page.form.food_desc')}
                    </div>
                    <div class="request-type-details">
                      <label for="foodQuantity">
                        {t('request-page.form.quanity')}{' '}
                      </label>
                      <input
                        type="number"
                        id="foodQuantity"
                        class="quantity-input"
                        value={food}
                        onChange={(e) => setFood(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div class="request-type">
                  <div>
                    <div class="request-type-label">
                      {t('request-page.form.shelter')}
                    </div>
                    <div class="request-type-description">
                      {t('request-page.form.shelter_desc')}
                    </div>
                    <div class="request-type-details">
                      <label for="shelterQuantity">
                        {t('request-page.form.quanity')}{' '}
                      </label>
                      <input
                        type="number"
                        id="shelterQuantity"
                        class="quantity-input"
                        value={shelter}
                        onChange={(e) => setShelter(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div class="request-type">
                  <div>
                    <div class="request-type-label">
                      {t('request-page.form.body_bag')}
                    </div>
                    <div class="request-type-description">
                      {t('request-page.form.body_bag_desc')}
                    </div>
                    <div class="request-type-details">
                      <label for="bodyBagsQuantity">
                        {t('request-page.form.quanity')}{' '}
                      </label>
                      <input
                        type="number"
                        id="bodyBagsQuantity"
                        class="quantity-input"
                        value={bodyBag}
                        onChange={(e) => setBodyBag(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                <div class="request-type">
                  <div>
                    <div class="request-type-label">
                      {t('request-page.form.feminine_products')}
                    </div>
                    <div class="request-type-description">
                      {t('request-page.form.feminine_products_desc')}
                    </div>
                    <div class="request-type-details">
                      <label for="feminineProductsQuantity">
                        {t('request-page.form.quanity')}{' '}
                      </label>
                      <input
                        type="number"
                        id="feminineProductsQuantity"
                        class="quantity-input"
                        value={feminineProducts}
                        onChange={(e) => setFeminineProducts(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* <div className="form-group">
            <label className="form-label" htmlFor="imageUpload">{t("request-page.form.image")}</label>
            <div className="image-upload-container">
              <input
                type="file"
                id="imageUpload"
                accept="image/*"
                className="form-input file-input"
                onChange={handleImageChange}
              />
              <div className="image-upload-info">
                {t("request-page.form.img_desc")}
              </div>

              {imagePreview && (
                <div className="image-preview-container">
                  <img src={imagePreview} alt="Preview" className="image-preview" />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={removeImage}
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>
          </div> */}
            <SpaceBetween size="s">
              <label className="form-label" htmlFor="imageUpload">
                {t('request-page.form.image')}
              </label>
              <FileInput
                onChange={({ detail }) => setImages(detail.value)}
                description={t('request-page.form.img_desc')}
                value={images}
                multiple
              >
                {t('request-page.form.img-btn')}
              </FileInput>
              <Table
                columnDefinitions={[
                  {
                    id: 'name',
                    header: t('request-page.form.img-btn'),
                    cell: (file) => file.name,
                  },
                  {
                    id: 'size',
                    header: t('request-page.form.img-btn'),
                    cell: (file) => file.size / 1000 + 'KB',
                  },
                  {
                    id: 'delete',
                    header: '',
                    cell: (file) => {
                      return (
                        <Button
                          iconName="close"
                          variant="icon"
                          size="small"
                          onClick={() => {
                            setImages(
                              images.filter(
                                (f) => f.name !== file.name
                              )
                            );
                          }}
                        />
                      );
                    },
                  },
                ]}
                items={images}
                empty={t('request-page.form.img_uploaded')}
              />
            </SpaceBetween>

            <Flashbar items={flashItem} />
            <button
              type="button"
              class="continue-btn"
              onClick={(e) => onSubmit()}
            >
              {t('request-page.form.submit')}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default withTranslation()(RequestForm);