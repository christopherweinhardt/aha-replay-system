import React from 'react';
import './NavBar.css'

const NavBar: React.FC = () => {
    return (
        <nav style={styles.navbar} className='cfa-navbar navbar-expand'>
            <div className="col-2">
                <div className='row'>
                    <a className='col-1 cfa-navbar-brand'>
                        <img src="https://aha.smartrest.cfahome.com/assets/CFA_Circle_Logo.png" width={36.5} height={36.5} alt="CFA Logo" />
                    </a>
                    <div className="col-1 cfa-11 padding-top-10 smart-restaurant-text">
                        Smart Restaurant Reports
                    </div>
                </div>
                <div className="col-7"></div>
            </div>
        </nav>
    );
};

const styles = {
    navbar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backgroundColor: '#f5f5f5',
        boxShadow: 'rgb(128, 128, 128) 0px 4px 2px -4px',
        color: '#fff',
    },
    header: {
        margin: 0,
        fontSize: '24px',
    },
};

export default NavBar;